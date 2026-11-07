import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { aiEditProjectText, aiListProjectText } from "../src/lib/ai-editor";
import { aiResult } from "../src/lib/ai-projects";
import projectSchemas from "../src/lib/verified-schemas.json";
import editorSchemas from "../src/lib/verified-editor-schemas.json";

async function fixture(
  run: (f: {
    config: { endpoint: URL; token: string };
    calls: string[];
    state: {
      text: string;
      wrongOpen: boolean;
      wrongSave: boolean;
      loseEditResponse: boolean;
      loseSavedText: boolean;
      changedSchema: boolean;
    };
  }) => Promise<void>,
) {
  const calls: string[] = [];
  const state = {
    text: "WEEKEND\nVIBES",
    wrongOpen: false,
    wrongSave: false,
    loseEditResponse: false,
    loseSavedText: false,
    changedSchema: false,
  };
  const server = createServer(async (req, res) => {
    if (req.method !== "POST") {
      res.writeHead(403).end();
      return;
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    const m = JSON.parse(body);
    if (m.id === undefined) {
      res.writeHead(202).end();
      return;
    }
    const send = (result: unknown) =>
      res
        .writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify({ jsonrpc: "2.0", id: m.id, result }));
    if (m.method === "initialize") {
      send({
        protocolVersion: m.params.protocolVersion,
        serverInfo: { name: "metapilot-native", version: "1" },
        capabilities: { tools: {} },
      });
      return;
    }
    if (m.method === "tools/list") {
      send({
        tools: Object.entries({ ...projectSchemas, ...editorSchemas }).map(([name, inputSchema]) => ({
          name,
          inputSchema:
            state.changedSchema && name === "editText" ? { ...inputSchema, required: ["unsupported"] } : inputSchema,
        })),
      });
      return;
    }
    const { name, arguments: args } = m.params;
    calls.push(name);
    const element = {
      id: "text-1",
      content: "text",
      text: state.text,
      startTime: 0,
      endTime: 3,
      secretInternalField: "not-for-ai",
    };
    let data: unknown;
    switch (name) {
      case "projects":
        data = { projects: [{ id: "demo", name: "Demo" }] };
        break;
      case "openProject":
        data = { id: state.wrongOpen ? "original" : args.id };
        break;
      case "elements":
        data =
          args.offset === 0
            ? { elements: [{ id: "video-1", content: "video" }], total: 2, nextOffset: 1 }
            : { elements: [element], total: 2 };
        break;
      case "getElement":
        data = element;
        break;
      case "editText":
        state.text = args.text;
        if (state.loseEditResponse) {
          res.destroy();
          return;
        }
        data = { text: state.text };
        break;
      case "saveProject":
        data = { saved: true, projectId: state.wrongSave ? "original" : "demo" };
        break;
      case "closeProject":
        if (state.loseSavedText) state.text = "WEEKEND\nVIBES";
        data = { closedProjectId: "demo" };
        break;
      default:
        throw new Error(name);
    }
    send({ content: [{ type: "text", text: JSON.stringify({ ok: true, ...(data as object) }) }] });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await run({
      config: { endpoint: new URL(`http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`), token: "test" },
      calls,
      state,
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
const edit = { projectId: "demo", elementId: "text-1", expectedText: "WEEKEND\nVIBES", text: "WEEKEND\nREWIND" };
test("text listing pages through non-text elements and strips private fields", () =>
  fixture(async ({ config, calls }) => {
    const result = await aiListProjectText(config, "demo");
    assert.equal(result.elements.length, 1);
    assert.equal(calls.filter((x) => x === "elements").length, 2);
    assert.deepEqual(structuredClone(result), result);
    assert.ok(!("secretInternalField" in result.elements[0]));
  }));
test("text edit saves and verifies persisted text after reopening exact project", () =>
  fixture(async ({ config, calls }) => {
    const result = await aiEditProjectText(config, edit);
    assert.equal(result.verifiedAfterReopen, true);
    assert.equal(result.element.text, edit.text);
    assert.deepEqual(structuredClone(result), result);
    assert.equal(calls.filter((x) => x === "editText").length, 1);
    assert.equal(calls.filter((x) => x === "openProject").length, 2);
  }));
test("wrong opened project cannot receive a text edit", () =>
  fixture(async ({ config, calls, state }) => {
    state.wrongOpen = true;
    await assert.rejects(aiEditProjectText(config, edit));
    assert.ok(!calls.includes("editText"));
  }));
test("stale original text cannot overwrite a later change", () =>
  fixture(async ({ config, calls, state }) => {
    state.text = "Someone else edited this";
    await assert.rejects(aiEditProjectText(config, edit));
    assert.ok(!calls.includes("editText"));
  }));
test("changed native schema blocks mutation", () =>
  fixture(async ({ config, calls, state }) => {
    state.changedSchema = true;
    await assert.rejects(aiEditProjectText(config, edit));
    assert.ok(!calls.includes("editText"));
  }));
test("a lost mutation response is never retried or reported as success", () =>
  fixture(async ({ config, calls, state }) => {
    state.loseEditResponse = true;
    const result = await aiResult(() => aiEditProjectText(config, edit));
    assert.equal(result.status, "error");
    assert.equal(calls.filter((x) => x === "editText").length, 1);
    assert.equal(state.text, edit.text);
  }));
test("wrong save identity stops before closing any project", () =>
  fixture(async ({ config, calls, state }) => {
    state.wrongSave = true;
    await assert.rejects(aiEditProjectText(config, edit));
    assert.ok(!calls.includes("closeProject"));
  }));
test("successful save response alone does not prove persistence", () =>
  fixture(async ({ config, state }) => {
    state.loseSavedText = true;
    await assert.rejects(aiEditProjectText(config, edit));
  }));
