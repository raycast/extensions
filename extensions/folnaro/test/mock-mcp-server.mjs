#!/usr/bin/env node
// A stand-in for folnaro-mcp: newline-delimited JSON-RPC 2.0 on stdin/stdout that replays a
// fixture. Used by the tests and for Store screenshots: set the extension's "Helper Path" to this
// file and it serves test/fixtures/demo.json (or MOCK_FIXTURE), so no real data is ever involved.
//
// Fixture format (test/fixtures/*.json):
// {
//   "initialize": { ...result of initialize... },           // optional, a default is used
//   "hang": ["tools/call:time_running"],                     // requests that never get an answer
//   "exitAfter": "tools/call:time_running",                  // exit with status 3 instead of answering
//   "exchanges": [
//     { "request": { "method": "tools/call", "params": { "name": "x", "arguments": { ... } } },
//       "response": { "result": { ... } } | { "error": { "code": -32602, "message": "..." } },
//       "repeat": true }                                     // reusable; otherwise answered once
//   ]
// }
// Arguments in a fixture request match as a subset. MOCK_LOG names a file that receives every
// request as one JSON line, so tests can check what the client sent.
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const fixturePath = process.env.MOCK_FIXTURE || join(dirname(fileURLToPath(import.meta.url)), "fixtures", "demo.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const exchanges = (fixture.exchanges ?? []).map((exchange) => ({ ...exchange, used: false }));
const hang = new Set(fixture.hang ?? []);

const defaultInitialize = {
  protocolVersion: "2025-11-25",
  capabilities: { tools: { listChanged: false }, resources: { listChanged: true, subscribe: true }, prompts: { listChanged: false }, completions: {} },
  serverInfo: { name: "folnaro", title: "Folnaro", version: "1.0.0" },
  instructions: "Mock of folnaro-mcp for tests.",
};

function subset(expected, actual) {
  if (expected === null || typeof expected !== "object") return expected === actual;
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && expected.length === actual.length && expected.every((item, index) => subset(item, actual[index]));
  }
  if (actual === null || typeof actual !== "object") return false;
  return Object.entries(expected).every(([key, value]) => subset(value, actual[key]));
}

function find(message) {
  const name = message.params?.name;
  return exchanges.find((exchange) => {
    if (exchange.used && !exchange.repeat) return false;
    const request = exchange.request;
    if (request.method !== message.method) return false;
    if (request.params?.name !== undefined && request.params.name !== name) return false;
    if (request.params?.arguments !== undefined && !subset(request.params.arguments, message.params?.arguments ?? {})) return false;
    return true;
  });
}

function send(object) {
  process.stdout.write(JSON.stringify(object) + "\n");
}

function handle(message) {
  if (process.env.MOCK_LOG) appendFileSync(process.env.MOCK_LOG, JSON.stringify(message) + "\n");
  if (message.id === undefined) return; // notification
  const key = message.method === "tools/call" ? `tools/call:${message.params?.name}` : message.method;
  if (hang.has(key)) return;
  if (fixture.exitAfter === key) process.exit(3);
  if (message.method === "initialize") {
    send({ jsonrpc: "2.0", id: message.id, result: fixture.initialize ?? defaultInitialize });
    return;
  }
  const exchange = find(message);
  if (!exchange) {
    const unknownTool = message.method === "tools/call";
    send({
      jsonrpc: "2.0",
      id: message.id,
      error: unknownTool
        ? { code: -32602, message: `Unknown tool "${message.params?.name}".` }
        : { code: -32601, message: `Unknown method "${message.method}".` },
    });
    return;
  }
  exchange.used = true;
  send({ jsonrpc: "2.0", id: message.id, ...exchange.response });
}

const lines = createInterface({ input: process.stdin });
lines.on("line", (line) => {
  if (!line.trim()) return;
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "The message is not valid JSON." } });
    return;
  }
  for (const message of Array.isArray(parsed) ? parsed : [parsed]) handle(message);
});
lines.on("close", () => process.exit(0));
