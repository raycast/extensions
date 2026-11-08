import assert from "node:assert/strict";
import { test, mock } from "node:test";
import {
  BedrockRuntimeClient,
  ThrottlingException,
  type ConverseStreamOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { readRewriteStream, rewrite } from "../src/bedrock";
import {
  buildPrompt,
  resolveModelId,
  validateConfig,
} from "../src/config";
import { RewriteError, rewriteError } from "../src/errors";
import { literalMarkdown } from "../src/preview";

const preferences: Preferences = {
  credentialMethod: "default",
  awsProfile: "",
  awsRegion: "us-east-1",
  modelId: "anthropic.claude-haiku-5-5",
  inferenceProfile: "global",
  maxTokens: "2048",
  temperature: "",
  defaultTone: "friendly",
};
async function* stream(events: ConverseStreamOutput[]) {
  yield* events;
}
const text = (value: string, index = 0): ConverseStreamOutput => ({
  contentBlockDelta: { contentBlockIndex: index, delta: { text: value } },
});
const end: ConverseStreamOutput = { messageStop: { stopReason: "end_turn" } };

test("model routing handles geography changes, direct models, and inference ARNs", () => {
  assert.equal(
    resolveModelId(preferences),
    "global.anthropic.claude-haiku-5-5",
  );
  assert.equal(
    resolveModelId({
      ...preferences,
      modelId: "us.anthropic.claude-haiku-5-5",
      inferenceProfile: "eu",
    }),
    "eu.anthropic.claude-haiku-5-5",
  );
  assert.equal(
    resolveModelId({
      ...preferences,
      modelId: "ca.anthropic.example",
      inferenceProfile: "none",
    }),
    "anthropic.example",
  );
  const arn =
    "arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/example";
  assert.equal(resolveModelId({ ...preferences, modelId: arn }), arn);
});

test("rejects malformed preferences before any AWS request", () => {
  for (const maxTokens of ["0", "-1", "2abc", "1.5", "Infinity", "65537"]) {
    assert.throws(
      () => validateConfig({ ...preferences, maxTokens }),
      /Max Tokens/,
    );
  }
  for (const temperature of ["-0.1", "1.01", "NaN", "Infinity", "warm"]) {
    assert.throws(
      () => validateConfig({ ...preferences, temperature }),
      /Temperature/,
    );
  }
  assert.deepEqual(
    validateConfig({ ...preferences, maxTokens: "", temperature: "0" }),
    { maxTokens: 2048, temperature: 0 },
  );
  assert.throws(
    () => validateConfig({ ...preferences, credentialMethod: "profile" }),
    /AWS Profile/,
  );
  assert.throws(
    () => validateConfig({ ...preferences, awsRegion: " " }),
    /AWS Region/,
  );
  assert.throws(
    () => validateConfig({ ...preferences, modelId: "" }),
    /Model ID/,
  );
  assert.throws(
    () =>
      validateConfig({
        ...preferences,
        modelId: "arn:aws:bedrock:us-east-1:123:prompt/example",
      }),
    /managed prompt/,
  );
});

test("source placeholders and replacement symbols remain literal; custom instruction overrides tone", () => {
  const input = "$& $` $' {{input_text}} </input>\nGrüße 世界";
  const prompt = buildPrompt(input, "friendly", "Translate to Spanish");
  assert.deepEqual(JSON.parse(prompt.slice(prompt.lastIndexOf("\n") + 1)), {
    text: input,
  });
  assert.match(prompt, /Translate to Spanish/);
  assert.doesNotMatch(prompt, /warm, approachable/);
});

test("stream joins split Unicode text and ignores reasoning blocks", async () => {
  const partials: string[] = [];
  const events: ConverseStreamOutput[] = [
    {
      contentBlockDelta: {
        contentBlockIndex: 0,
        delta: { reasoningContent: { text: "private reasoning" } },
      },
    },
    text("Grüße ", 1),
    text("世界", 1),
    end,
  ];
  assert.equal(
    await readRewriteStream(stream(events), 2048, (value) =>
      partials.push(value),
    ),
    "Grüße 世界",
  );
  assert.deepEqual(partials, ["Grüße ", "Grüße 世界"]);
});

test("valid short summaries and expanded rewrites are not rejected by length heuristics", async () => {
  assert.equal(
    await readRewriteStream(stream([text("Yes."), end]), 20),
    "Yes.",
  );
  assert.equal(
    await readRewriteStream(stream([text("long ".repeat(500)), end]), 2048),
    "long ".repeat(500),
  );
});

test("never returns truncated, filtered, empty, or interrupted output as a completed rewrite", async () => {
  for (const stopReason of [
    "max_tokens",
    "guardrail_intervened",
    "content_filtered",
    "model_context_window_exceeded",
  ] as const) {
    await assert.rejects(
      readRewriteStream(
        stream([text("Partial"), { messageStop: { stopReason } }]),
        10,
      ),
    );
  }
  await assert.rejects(
    readRewriteStream(stream([text("Partial")]), 20),
    /did not finish/,
  );
  await assert.rejects(readRewriteStream(stream([end]), 20), /no text/);
  await assert.rejects(
    readRewriteStream(
      stream([
        {
          throttlingException: new ThrottlingException({
            message: "Slow down",
            $metadata: {},
          }),
        },
      ]),
      20,
    ),
    { name: "ThrottlingException" },
  );
});

test("preview escapes images, HTML, fences, entities, and indented code while preserving lines", () => {
  const preview = literalMarkdown(
    "![track](https://example.com/private)\n<script>test</script>\n&amp;\n```\n    indented",
  );
  assert.ok(
    preview.startsWith("\\!\\[track\\]\\(https://example\\.com/private\\)"),
  );
  assert.ok(preview.includes("\\<script\\>test\\</script\\>"));
  assert.ok(preview.includes("\\&amp;"));
  assert.ok(preview.includes("\\`\\`\\`"));
  assert.ok(preview.endsWith("\u00a0".repeat(4) + "indented"));
  assert.ok(preview.includes("  \n"));
});

test("provider diagnostics never leak into user-facing errors", () => {
  assert.doesNotMatch(
    rewriteError(new Error("secretAccessKey=private-value")),
    /private-value/,
  );
  assert.doesNotMatch(
    rewriteError(
      Object.assign(new Error("credential helper stdout secret"), {
        name: "CredentialsProviderError",
      }),
    ),
    /stdout secret/,
  );
  assert.match(
    rewriteError(new RewriteError("Increase Max Tokens.")),
    /Increase Max Tokens/,
  );
  assert.match(
    rewriteError(
      Object.assign(new Error("denied"), { name: "AccessDeniedException" }),
    ),
    /InvokeModelWithResponseStream/,
  );
});

test("request uses streaming, exact source, explicit budget, model-specific options, and destroys client", async () => {
  let input: unknown;
  const send = mock.method(
    BedrockRuntimeClient.prototype,
    "send",
    async (command: { input: unknown }) => {
      input = command.input;
      return { stream: stream([text("Rewritten."), end]) };
    },
  );
  const destroy = mock.method(
    BedrockRuntimeClient.prototype,
    "destroy",
    () => {},
  );
  try {
    assert.equal(
      await rewrite({ text: "  Original  ", tone: "neutral", preferences }),
      "Rewritten.",
    );
    const command = input as {
      modelId: string;
      inferenceConfig: unknown;
      additionalModelRequestFields?: unknown;
      messages: { content: { text: string }[] }[];
    };
    assert.equal(command.modelId, "global.anthropic.claude-haiku-5-5");
    assert.deepEqual(command.inferenceConfig, { maxTokens: 2048 });
    assert.deepEqual(command.additionalModelRequestFields, {
      thinking: { type: "disabled" },
    });
    assert.match(command.messages[0].content[0].text, /  Original  /);
    await rewrite({
      text: "Original",
      tone: "neutral",
      preferences: { ...preferences, modelId: "anthropic.claude-sonnet-5-5" },
    });
    assert.equal(
      (input as typeof command).additionalModelRequestFields,
      undefined,
    );
    assert.equal(destroy.mock.callCount(), 2);
  } finally {
    send.mock.restore();
    destroy.mock.restore();
  }
});

test("cancel settles even if a credential provider or transport never responds", async () => {
  const send = mock.method(
    BedrockRuntimeClient.prototype,
    "send",
    () => new Promise(() => {}),
  );
  const destroy = mock.method(
    BedrockRuntimeClient.prototype,
    "destroy",
    () => {},
  );
  const controller = new AbortController();
  try {
    const request = rewrite({
      text: "Original",
      tone: "neutral",
      preferences,
      signal: controller.signal,
    });
    controller.abort();
    await assert.rejects(request, /canceled/);
    assert.equal(destroy.mock.callCount(), 1);
  } finally {
    send.mock.restore();
    destroy.mock.restore();
  }
});
