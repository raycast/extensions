import { test } from "node:test";
import assert from "node:assert/strict";
import type OpenAI from "openai";
import { type AgentResponse, consumeAgentStream, runAgent } from "../src/hook/agent.ts";

type Event = { type: string; delta?: string; response?: AgentResponse };

async function* events(list: Event[], error?: Error): AsyncGenerator<Event> {
  for (const event of list) yield event;
  if (error) throw error;
}

const completed: AgentResponse = {
  output: [
    {
      type: "search_results",
      results: [
        { id: 2, url: "https://b.example" },
        { id: 1, url: "https://a.example" },
      ],
    },
    { type: "message", content: [{ type: "output_text", text: "Hello world [1]" }] },
  ],
  usage: { cost: { total_cost: 0.0042 } },
};

test("completion: deltas stream in, then the completed response's text replaces them", async () => {
  const seen: string[] = [];
  const stream = events([
    { type: "response.output_text.delta", delta: "Hel" },
    { type: "response.output_text.delta", delta: "lo" },
    { type: "response.completed", response: completed },
  ]);
  const { text, response } = await consumeAgentStream(stream, (t) => seen.push(t));
  assert.deepEqual(seen, ["Hel", "Hello", "Hello world [1]"]);
  assert.equal(text, "Hello world [1]");
  assert.equal(response, completed);
});

test("failure: a failed event, an error event or a throwing stream rejects", async () => {
  await assert.rejects(
    consumeAgentStream(
      events([{ type: "response.output_text.delta", delta: "x" }, { type: "response.failed" }]),
      () => {},
    ),
    /response\.failed/,
  );
  await assert.rejects(
    consumeAgentStream(events([{ type: "error" }]), () => {}),
    /error/,
  );
  await assert.rejects(
    consumeAgentStream(events([], new Error("socket closed")), () => {}),
    /socket closed/,
  );
  await assert.rejects(
    consumeAgentStream(events([{ type: "response.output_text.delta", delta: "x" }]), () => {}),
    /without response\.completed/,
  );
});

test("returned fields: a streamed run returns the completed response's text, sources and cost", async () => {
  const client = {
    responses: {
      create: async () =>
        events([
          { type: "response.output_text.delta", delta: "Hello" },
          { type: "response.completed", response: completed },
        ]),
    },
  } as unknown as OpenAI;
  const result = await runAgent(client, { input: [], preset: "fast", stream: true });
  assert.deepEqual(result, {
    text: "Hello world [1]",
    citations: [
      { id: 1, url: "https://a.example" },
      { id: 2, url: "https://b.example" },
    ],
    cost: 0.0042,
  });
});
