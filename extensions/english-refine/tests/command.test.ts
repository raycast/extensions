import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { vi, test } from "vitest";
import { DEFAULT_SYSTEM_PROMPT } from "../src/refine";

const source = "can you fix this before 5pm? do not change `${name}`.";
const result = "Can you fix this before 5 p.m.? Do not change `${name}`.";
let selections: string[] = [];
let badges: string[] = [];
let pasted: string[] = [];
let baseUrl = "";

vi.doMock("@raycast/api", () => ({
  getPreferenceValues: () => ({ apiKey: "test-key", baseUrl }),
  getSelectedText: async () => selections.shift() ?? "",
  LocalStorage: {
    getItem: async (key: string) =>
      key === "system-prompt"
        ? DEFAULT_SYSTEM_PROMPT
        : JSON.stringify({ modelId: "discovered-editor", effort: "low", mode: "normal" }),
  },
  showHUD: async (message: string) => void badges.push(message),
  Clipboard: { paste: async (text: string) => void pasted.push(text) },
}));

const { default: command } = await import("../src/refine-text");

test("shortcut command refines and pastes immediately, with badges, and preserves changed selections on failure", async () => {
  const requests: Record<string, unknown>[] = [];
  let rejectGeneration = false;
  const server = createServer(async (request, reply) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    reply.setHeader("Content-Type", "application/json");
    if (request.url?.startsWith("/v1/models")) {
      reply.end(
        JSON.stringify({
          data: [{ id: "discovered-editor", supported_reasoning_levels: [{ effort: "low" }] }],
        }),
      );
      return;
    }
    requests.push(JSON.parse(body));
    reply.statusCode = rejectGeneration ? 401 : 200;
    reply.end(
      JSON.stringify(
        rejectGeneration
          ? { error: { message: "private provider details", type: "authentication_error" } }
          : { choices: [{ finish_reason: "stop", message: { content: result } }] },
      ),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  try {
    selections = [source, source];
    await command();
    assert.deepEqual(pasted, [result]);
    assert.deepEqual(badges, ["Loading Refine settings…", "Refining selected text…", "Text refined"]);
    assert.deepEqual(requests[0], {
      model: "discovered-editor",
      reasoning_effort: "low",
      messages: [
        { role: "system", content: DEFAULT_SYSTEM_PROMPT },
        { role: "user", content: source },
      ],
    });

    selections = [source, "another selection"];
    badges = [];
    pasted = [];
    await command();
    assert.deepEqual(pasted, []);
    assert.equal(badges.at(-1), "Selection changed. Select the text and try again.");

    rejectGeneration = true;
    selections = [source, source];
    await command();
    assert.deepEqual(pasted, []);
    assert.equal(badges.at(-1), "The provider rejected access. Check your API key and model permissions.");
    assert.equal(
      badges.some((badge) => badge.includes("private provider details")),
      false,
    );

    const count = requests.length;
    selections = [""];
    await command();
    assert.equal(requests.length, count);
    assert.deepEqual(pasted, []);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
