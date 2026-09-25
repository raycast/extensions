import assert from "node:assert/strict";
import * as http from "node:http";
import { AddressInfo } from "node:net";
import { test } from "node:test";
import { AIError, buildRequestBody, generateText, parseExtraParams } from "../src/ai/llm";

async function withServer(handler: http.RequestListener, run: (baseUrl: string) => Promise<void>) {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`);
  } finally {
    server.close();
  }
}

test("streams an OpenAI-compatible answer", async () => {
  let receivedBody: { model?: string; stream?: boolean } = {};
  await withServer(
    (req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        receivedBody = JSON.parse(body);
        assert.equal(req.url, "/v1/chat/completions");
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        for (const token of ["<think>hmm</think>", "Hello", ", ", "world"]) {
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: token } }] })}\n\n`);
        }
        res.end("data: [DONE]\n\n");
      });
    },
    async (baseUrl) => {
      const partials: string[] = [];
      const text = await generateText([{ role: "user", content: "hi" }], {
        config: { baseUrl, model: "llama3.2" },
        onText: (partial) => partials.push(partial),
      });
      assert.equal(text, "Hello, world");
      assert.ok(partials.length >= 3);
      assert.equal(receivedBody.model, "llama3.2");
      assert.equal(receivedBody.stream, true);
    },
  );
});

test("supports servers that don't stream", async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content: "Done" } }] }));
    },
    async (baseUrl) => {
      assert.equal(await generateText([], { config: { baseUrl, model: "m" } }), "Done");
    },
  );
});

test("explains HTTP errors", async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "bad key" } }));
    },
    async (baseUrl) => {
      await assert.rejects(generateText([], { config: { baseUrl, model: "m" } }), (error: Error) => {
        assert.ok(error instanceof AIError);
        assert.match(error.message, /API key/);
        assert.match(error.message, /bad key/);
        return true;
      });
    },
  );
});

test("explains when the local server is not running", async () => {
  await assert.rejects(
    generateText([], { config: { baseUrl: "http://localhost:1/v1", model: "m" } }),
    /Could not connect to your local AI server/,
  );
});

test("parses extra parameters as flags or JSON", () => {
  assert.deepEqual(parseExtraParams("--think=false --temperature 0.2 top_p=0.9 --stop '###'"), {
    think: false,
    temperature: 0.2,
    top_p: 0.9,
    stop: "###",
  });
  assert.deepEqual(parseExtraParams('{"temperature": 0.5, "seed": 1}'), { temperature: 0.5, seed: 1 });
  assert.deepEqual(parseExtraParams("  "), {});
  assert.throws(() => parseExtraParams("{ nope"), /not valid JSON/);
  assert.throws(() => parseExtraParams("[1]"), AIError);
});

test("maps --think=false and the thinking preference to reasoning_effort", () => {
  const base = { baseUrl: "http://localhost:11434/v1", model: "qwen3" };
  const body = buildRequestBody([], { ...base, extraParams: "--think=false --temperature=0.2" });
  assert.equal(body.reasoning_effort, "none");
  assert.equal(body.temperature, 0.2);
  assert.equal("think" in body, false);

  assert.equal(buildRequestBody([], { ...base, thinking: "none" }).reasoning_effort, "none");
  assert.equal("reasoning_effort" in buildRequestBody([], { ...base, thinking: "default" }), false);
  // Extra parameters win over the dropdown, and can't break the request.
  const overridden = buildRequestBody([{ role: "user", content: "hi" }], {
    ...base,
    thinking: "high",
    extraParams: '{"reasoning_effort": "low", "stream": false, "messages": []}',
  });
  assert.equal(overridden.reasoning_effort, "low");
  assert.equal(overridden.stream, true);
  assert.equal((overridden.messages as unknown[]).length, 1);
});

test("sends the extra parameters to the server", async () => {
  let receivedBody: Record<string, unknown> = {};
  await withServer(
    (req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        receivedBody = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ choices: [{ message: { content: "ok" } }] }));
      });
    },
    async (baseUrl) => {
      await generateText([], { config: { baseUrl, model: "qwen3", extraParams: "--think=false" } });
      assert.equal(receivedBody.reasoning_effort, "none");
    },
  );
});
