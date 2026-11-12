import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  parseConnectionConfig,
  safeConnectionError,
  redactConnectionSecrets,
  type ConnectionConfig,
} from "../src/lib/config";
import { createLocalFetch } from "../src/lib/connection";
import { collectPages, discoverCapabilities } from "../src/lib/discovery";
import { decodeToolResult, getAvailability, loadProjects, parseProjects, runProjectAction } from "../src/lib/projects";
import schemas from "../src/lib/verified-schemas.json";

import { aiListProjects, aiProjectAction, aiResult, serializeProject } from "../src/lib/ai-projects";

const initial = { id: "project-1", name: "Original", isFavorite: false, isPinned: false };
async function fixture(
  run: (f: {
    config: ConnectionConfig;
    calls: string[];
    state: {
      projects: (typeof initial)[];
      failMutation: boolean;
      changedSchema: boolean;
      wrongOpenId: boolean;
      failVerification: boolean;
    };
  }) => Promise<void>,
) {
  const state = {
    projects: [{ ...initial }],
    failMutation: false,
    changedSchema: false,
    wrongOpenId: false,
    failVerification: false,
  };
  const calls: string[] = [];
  const server = createServer(async (request, response) => {
    if (request.headers.authorization !== "Bearer test-local-token") {
      response.writeHead(401).end("secret server error");
      return;
    }
    // Edits 454 rejects the optional standalone event stream. This must not poison later requests.
    if (request.method === "GET") {
      response.writeHead(403).end();
      return;
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    const message = JSON.parse(body);
    calls.push(message.method === "tools/call" ? message.params.name : message.method);
    if (message.id === undefined) {
      response.writeHead(202).end();
      return;
    }
    const send = (result: unknown) =>
      response
        .writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }));
    const toolResult = (value: unknown) =>
      send({ content: [{ type: "text", text: JSON.stringify(value) }], isError: false });
    switch (message.method) {
      case "initialize":
        send({
          protocolVersion: message.params.protocolVersion,
          serverInfo: { name: "metapilot-native", version: "1.0.0" },
          capabilities: { tools: { listChanged: true }, resources: {} },
        });
        break;
      case "tools/list":
        send({
          tools: Object.entries(schemas).map(([name, inputSchema]) => ({
            name,
            inputSchema:
              state.changedSchema && name === "duplicateProject"
                ? { ...inputSchema, required: ["id", "newArgument"] }
                : inputSchema,
          })),
        });
        break;
      case "resources/list":
        send({ resources: [{ name: "app-state", uri: "metapilot://app-state" }] });
        break;
      case "resources/templates/list":
        response
          .writeHead(200, { "Content-Type": "application/json" })
          .end(
            JSON.stringify({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "Method not found" } }),
          );
        break;
      case "tools/call": {
        const { name, arguments: args } = message.params;
        if (name === "projects") {
          toolResult({ ok: true, projects: state.projects, cloudRefreshTimedOut: true });
          break;
        }
        if (state.failMutation) {
          request.socket.destroy();
          break;
        }
        const project = state.projects.find((p) => p.id === args.id)!;
        if (name === "duplicateProject") {
          const copy = { ...project, id: "project-2", name: "Original copy" };
          if (!state.failVerification) state.projects.push(copy);
          toolResult({ ok: true, id: copy.id });
        } else if (name === "renameProject") {
          project.name = args.name;
          toolResult({ ok: true });
        } else if (name === "toggleFavorite") {
          project.isFavorite = !project.isFavorite;
          toolResult({ ok: true });
        } else if (name === "togglePin") {
          project.isPinned = !project.isPinned;
          toolResult({ ok: true });
        } else if (name === "openProject") {
          assert.equal(args.name, "");
          toolResult({ ok: true, id: state.wrongOpenId ? "wrong" : args.id });
        }
        break;
      }
      default:
        response.writeHead(500).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const config = parseConnectionConfig({
    endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`,
    token: "test-local-token",
  });
  try {
    await run({ config, calls, state });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("configuration requires an explicit local endpoint and credential", () => {
  for (const endpoint of [
    "https://example.com/mcp",
    "file:///tmp/a",
    "http://127.0.0.1.evil.test/mcp",
    "http://user:password@localhost/mcp",
    "http://localhost/mcp#secret",
  ]) {
    assert.throws(() => parseConnectionConfig({ endpoint, token: "secret" }));
  }
  assert.throws(() => parseConnectionConfig({ endpoint: "http://localhost/mcp" }), /secure Token/);
  assert.throws(() => parseConnectionConfig({ endpoint: "http://localhost/mcp", token: "a\nb" }));
  assert.equal(parseConnectionConfig({ endpoint: "http://[::1]/mcp", token: "secret" }).endpoint.hostname, "[::1]");
});

test("redirects and cross-origin SSE endpoints cannot receive credentials", async () => {
  const config = parseConnectionConfig({ endpoint: "http://localhost:1234/mcp", token: "secret" });
  let sent = 0;
  const guarded = createLocalFetch(config, new AbortController().signal, async (_input, init) => {
    sent++;
    assert.equal(init?.redirect, "manual");
    return new Response(null, { status: 307, headers: { Location: "https://example.com" } });
  });
  await assert.rejects(guarded("http://localhost:1234/mcp"), /Redirects are not followed/);
  await assert.rejects(guarded("http://localhost:5678/messages"), /different origin/);
  assert.equal(sent, 1);
});

test("diagnostics and reflected metadata redact credentials", () => {
  const config = parseConnectionConfig({ endpoint: "http://localhost/mcp?key=private", token: 'token"value' });
  assert.doesNotMatch(redactConnectionSecrets(`token"value ${config.endpoint.href} private`, config), /token|private/);
  assert.doesNotMatch(safeConnectionError(new Error("secret raw response")).message, /secret raw response/);
});

test("pagination continues through empty pages and rejects loops", async () => {
  assert.deepEqual(
    await collectPages(async (cursor) => (cursor ? { items: [1] } : { items: [], nextCursor: "next" })),
    [1],
  );
  await assert.rejects(
    collectPages(async () => ({ items: [], nextCursor: "loop" })),
    /repeated/,
  );
});

test("tool results require verified success and unique project references", () => {
  for (const data of [{ ok: false }, { error: "failed" }, { ok: true, isError: true }]) {
    const result = { isError: data.isError, content: [{ type: "text", text: JSON.stringify(data) }] } as CallToolResult;
    assert.throws(() => decodeToolResult(result));
  }
  assert.throws(() => parseProjects({ projects: [initial, initial] }), /duplicate project/);
  assert.throws(() => parseProjects({ projects: [{ name: "No id" }] }), /unexpected project format/);
});

test("changed schemas disable only affected operations", () => {
  const tools = Object.entries(schemas).map(([name, inputSchema]) => ({ name, inputSchema })) as Tool[];
  assert.equal(getAvailability(tools).duplicateProject, true);
  tools.find((tool) => tool.name === "duplicateProject")!.inputSchema = { type: "object", required: ["newField"] };
  assert.equal(getAvailability(tools).duplicateProject, false);
  assert.equal(getAvailability(tools).projects, true);
});

test("live HTTP discovery handles Edits' missing template method and sends no tool calls", async () =>
  fixture(async ({ config, calls }) => {
    const result = await discoverCapabilities(config);
    assert.equal(result.tools.length, Object.keys(schemas).length);
    assert.equal(result.resources.length, 1);
    assert.equal(result.resourceTemplatesSupported, false);
    assert.equal(
      calls.some((method) => Object.keys(schemas).includes(method)),
      false,
    );
  }));

test("authentication failures contain recovery instructions without server response bodies", async () =>
  fixture(async ({ config }) => {
    await assert.rejects(
      discoverCapabilities({ ...config, token: "wrong" }),
      (error: Error) => /credential/.test(error.message) && !/secret server error/.test(error.message),
    );
  }));

test("project workflows use IDs and verify persisted responses", async () =>
  fixture(async ({ config }) => {
    const before = await loadProjects(config);
    assert.equal(before.cloudRefreshTimedOut, true);
    const copy = await runProjectAction(config, "duplicateProject", before.projects[0]);
    assert.equal(copy.id, "project-2");
    const renamed = await runProjectAction(config, "renameProject", copy, "Renamed");
    assert.equal(renamed.name, "Renamed");
    const favorite = await runProjectAction(config, "toggleFavorite", renamed);
    assert.equal(favorite.isFavorite, true);
    const pinned = await runProjectAction(config, "togglePin", favorite);
    assert.equal(pinned.isPinned, true);
    assert.equal((await runProjectAction(config, "openProject", pinned)).id, pinned.id);
  }));

test("stale toggle state does not flip the opposite value", async () =>
  fixture(async ({ config, state, calls }) => {
    state.projects[0].isFavorite = true;
    await assert.rejects(runProjectAction(config, "toggleFavorite", initial), /status changed/);
    assert.equal(calls.includes("toggleFavorite"), false);
  }));

test("changed live schemas block mutation before dispatch", async () =>
  fixture(async ({ config, state, calls }) => {
    state.changedSchema = true;
    await assert.rejects(runProjectAction(config, "duplicateProject", initial), /schema has changed/);
    assert.equal(calls.includes("duplicateProject"), false);
  }));

test("a lost mutation response is not retried", async () =>
  fixture(async ({ config, state, calls }) => {
    state.failMutation = true;
    await assert.rejects(runProjectAction(config, "duplicateProject", initial), /may have completed/);
    assert.equal(calls.filter((name) => name === "duplicateProject").length, 1);
  }));

test("unverified duplicate and wrong opened project never report success", async () =>
  fixture(async ({ config, state }) => {
    state.failVerification = true;
    await assert.rejects(runProjectAction(config, "duplicateProject", initial), /before repeating/);
    state.wrongOpenId = true;
    await assert.rejects(runProjectAction(config, "openProject", initial), /Check Edits/);
  }));

// AI adapters are exercised against the same HTTP fixture as the UI service.
// This proves desired-state actions do not become unsafe toggle retries.
test("AI serialization excludes SDK internals and produces cloneable results", () => {
  const raw = { ...initial, _request: () => {}, token: "private" };
  assert.throws(() => structuredClone(raw));
  const result = serializeProject(raw);
  assert.deepEqual(structuredClone(result), result);
  assert.equal("_request" in result, false);
  assert.equal("token" in result, false);
  assert.equal(result.size, null);
});

test("AI search returns plain projects and requires exact references for actions", async () =>
  fixture(async ({ config, calls }) => {
    const found = await aiListProjects(config, "ORIG");
    assert.equal(found.projects.length, 1);
    assert.deepEqual(structuredClone(found), found);
    assert.equal((await aiListProjects(config, "missing")).projects.length, 0);
    const rejected = await aiResult(() =>
      aiProjectAction(config, { action: "renameProject", projectId: "Original", name: "Final" }),
    );
    assert.equal(rejected.status, "error");
    assert.equal(calls.includes("renameProject"), false);
  }));

test("AI favorite and pin actions set desired state without toggling on repeat", async () =>
  fixture(async ({ config, calls }) => {
    for (const action of ["toggleFavorite", "togglePin"] as const) {
      const first = await aiProjectAction(config, { action, projectId: initial.id, enabled: true });
      const again = await aiProjectAction(config, { action, projectId: initial.id, enabled: true });
      assert.equal(first.changed, true);
      assert.equal(again.changed, false);
      assert.equal(calls.filter((name) => name === action).length, 1);
      const disabled = await aiProjectAction(config, { action, projectId: initial.id, enabled: false });
      assert.equal(disabled.changed, true);
      assert.equal(calls.filter((name) => name === action).length, 2);
    }
  }));

test("AI rename is a no-op when the project already has the requested name", async () =>
  fixture(async ({ config, calls }) => {
    const result = await aiProjectAction(config, {
      action: "renameProject",
      projectId: initial.id,
      name: initial.name,
    });
    assert.equal(result.changed, false);
    assert.equal(calls.includes("renameProject"), false);
  }));

test("AI mutation failures return non-retryable plain data without duplicating work", async () =>
  fixture(async ({ config, state, calls }) => {
    state.failMutation = true;
    const result = await aiResult(() => aiProjectAction(config, { action: "duplicateProject", projectId: initial.id }));
    assert.equal(result.status, "error");
    assert.deepEqual(structuredClone(result), result);
    if (result.status === "error") {
      assert.equal(result.retryAllowed, false);
      assert.equal(result.title, "Operation outcome unknown");
    }
    assert.equal(calls.filter((name) => name === "duplicateProject").length, 1);
  }));

test("unexpected AI errors do not expose raw credentials or transport details", async () => {
  const result = await aiResult(async () => {
    throw new Error("Bearer private-token at http://localhost/secret");
  });
  assert.doesNotMatch(JSON.stringify(result), /private-token|localhost\/secret/);
  assert.equal(result.status, "error");
});
