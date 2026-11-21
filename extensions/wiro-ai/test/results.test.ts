import assert from "node:assert/strict";
import { test } from "node:test";
import { agentReply, isMessageFinished, messageFailed, replyMedia, toAgentSummary } from "../src/lib/agent";
import { kindOf, taskResults } from "../src/lib/outputs";
import { fullSlugOf, isRunFinished, parseWorkflow, runOutputs, runProgress } from "../src/lib/workflow";

test("task outputs become items by kind, with LLM answers and printed text as text", () => {
  const files = taskResults({
    id: "9",
    outputs: [
      { name: "0.png", contenttype: "image/png", url: "https://cdn1.wiro.ai/x/0.png", size: "2048" },
      { contenttype: "", url: "https://cdn1.wiro.ai/x/clip.mp4?v=1" },
      { contenttype: "audio/mpeg", url: "https://cdn1.wiro.ai/x/voice.mp3" },
    ],
  });
  assert.deepEqual(
    files.map((item) => [item.kind, item.name]),
    [
      ["image", "0.png"],
      ["video", "clip.mp4"],
      ["audio", "voice.mp3"],
    ],
  );
  assert.equal(files[0].sizeBytes, 2048);

  const answer = taskResults({
    id: "10",
    outputs: [{ contenttype: "raw", content: { answer: ["Hello ", { text: "there" }] } }],
  });
  assert.deepEqual(
    answer.map((item) => [item.kind, item.text]),
    [["text", "Hello there"]],
  );

  const transcript = taskResults({ id: "11", outputs: [], debugoutput: "  the transcript  " });
  assert.equal(transcript[0].text, "the transcript");
  assert.equal(kindOf("text/plain", "a.bin"), "text");
  assert.equal(kindOf(undefined, "https://x/a.srt"), "text");
  assert.equal(kindOf(undefined, "https://x/a.glb"), "file");
});

const workflowRow = {
  slug: "product-ad",
  slugid: "Ab12C",
  title: "Product Ad",
  stepcount: "3",
  requiredinputs: ["photo"],
  contents: JSON.stringify({
    schema: {
      input: {
        photo: { label: "Product Photo", type: "string", ui: { field: "image" } },
        brief: { label: "Brief", type: "string", ui: { field: "textarea" }, defaultValue: "Short and bright" },
        tone: { label: "Tone", type: "string", ui: { field: "select", options: [{ value: "warm", text: "Warm" }] } },
        api_key: { label: "API key", type: "string" },
        count: { label: "Count", type: "number" },
      },
    },
    metadata: { input: { values: { tone: "warm", api_key: "sk-secret" } } },
    nodes: {
      "node-img": { tool: "acme/image" },
      "node-copy": { tool: "acme/llm" },
      output: {
        fields: { image: "$node-img.outputs", copy: "$node-copy.outputs", brief: "$input.brief", note: "fixed" },
      },
    },
  }),
};

test("workflow inputs keep their kind, saved values and required flag, never a saved secret", () => {
  const info = parseWorkflow(workflowRow);
  assert.equal(fullSlugOf(workflowRow), "product-ad-Ab12C");
  assert.equal(info.url, "https://wiro.ai/workflows/product-ad-Ab12C");
  assert.equal(info.stepCount, 3);
  const byKey = Object.fromEntries(info.inputs.map((input) => [input.key, input]));
  assert.deepEqual([byKey.photo.kind, byKey.photo.fileKind, byKey.photo.required], ["file", "image", true]);
  assert.deepEqual([byKey.brief.kind, byKey.brief.initialValue], ["longtext", "Short and bright"]);
  assert.deepEqual([byKey.tone.kind, byKey.tone.initialValue, byKey.tone.options.length], ["select", "warm", 1]);
  assert.equal(byKey.api_key.initialValue, "");
  assert.equal(byKey.count.kind, "number");
});

test("a finished run's End step references resolve to items", () => {
  const info = parseWorkflow(workflowRow);
  const nodes = [
    {
      nodeId: "node-img",
      status: "completed",
      outputs: [{ url: "https://cdn1.wiro.ai/r/ad.png", contenttype: "image/png" }],
    },
    { nodeId: "node-copy", status: "completed", outputs: [{ contenttype: "raw", content: { answer: ["Buy now"] } }] },
  ];
  const outputs = runOutputs(info.contents, nodes);
  assert.deepEqual(
    outputs.map((output) => [output.field, output.items.map((item) => item.kind)]),
    [
      ["image", ["image"]],
      ["copy", ["text"]],
      ["brief", ["text"]],
      ["note", ["text"]],
    ],
  );
  assert.equal(outputs[1].items[0].text, "Buy now");
  assert.equal(outputs[2].items[0].text, "Short and bright");
  const failedStep = runOutputs(info.contents, [{ nodeId: "node-img", status: "failed" }]);
  assert.equal(failedStep[0].items.length, 0);
  assert.deepEqual(runProgress({ status: "running" }, nodes), { status: "running", done: 2, total: 2, failedSteps: 0 });
  assert.equal(isRunFinished("completed"), true);
  assert.equal(isRunFinished("running"), false);
});

test("agents and their replies", () => {
  const agent = toAgentSummary({ guid: "abc", title: "Helper", status: "4", remainingcredits: "120", teamguid: "t" });
  assert.deepEqual([agent.running, agent.statusLabel, agent.creditsLeft, agent.team], [true, "Running", 120, true]);
  assert.equal(toAgentSummary({ guid: "x", status: 6 }).statusLabel, "Setup required");
  assert.equal(agentReply({ response: " Done. " }), "Done.");
  assert.equal(
    agentReply({
      timeline: [
        { type: "answer", text: "world", order: 2 },
        { type: "answer", text: "Hello ", order: 1 },
      ],
    }),
    "Hello world",
  );
  assert.equal(agentReply({ debugoutput: "printed" }), "printed");
  assert.deepEqual(replyMedia("Here it is:\nMEDIA: https://cdn1.wiro.ai/a/b.png\nsee https://example.com"), [
    "https://cdn1.wiro.ai/a/b.png",
  ]);
  assert.equal(isMessageFinished("agent_end"), true);
  assert.equal(isMessageFinished("agent_output"), false);
  assert.equal(messageFailed("agent_error"), true);
});

test("only secret-looking workflow inputs lose their saved value", () => {
  const info = parseWorkflow({
    slug: "w",
    slugid: "1",
    contents: {
      schema: {
        input: {
          max_tokens: { label: "Max tokens", type: "number" },
          openai_api_key: { label: "Key", type: "string" },
          accessToken: { label: "Token", type: "string" },
        },
      },
      metadata: { input: { values: { max_tokens: 512, openai_api_key: "sk-x", accessToken: "t" } } },
    },
  });
  const byKey = Object.fromEntries(info.inputs.map((input) => [input.key, input]));
  assert.equal(byKey.max_tokens.initialValue, "512");
  assert.equal(byKey.openai_api_key.initialValue, "");
  assert.equal(byKey.accessToken.initialValue, "");
  assert.equal(byKey.openai_api_key.hasSavedValue, true, "a saved secret still counts as given");
});
