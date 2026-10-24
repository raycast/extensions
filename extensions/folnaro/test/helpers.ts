import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FolnaroApi } from "../src/lib/folnaro";
import { McpClient, type McpClientOptions } from "../src/lib/mcp-client";

export const MOCK_SERVER = join(__dirname, "mock-mcp-server.mjs");
export const fixture = (name: string) => join(__dirname, "fixtures", name);

export interface Harness {
  client: McpClient;
  api: FolnaroApi;
  /** Every JSON-RPC message the mock received, in order. */
  sent: () => { id?: number; method: string; params?: { name?: string; arguments?: Record<string, unknown> } }[];
}

/** A client talking to the mock helper process that replays `name` from test/fixtures. */
export function harness(name: string, options: Partial<McpClientOptions> = {}): Harness {
  const log = join(mkdtempSync(join(tmpdir(), "folnaro-raycast-")), "requests.jsonl");
  const client = new McpClient({
    command: process.execPath,
    args: [MOCK_SERVER],
    env: { MOCK_FIXTURE: fixture(name), MOCK_LOG: log },
    clientName: "raycast",
    ...options,
  });
  return {
    client,
    api: new FolnaroApi(client),
    sent: () => {
      try {
        return readFileSync(log, "utf8")
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line));
      } catch {
        return [];
      }
    },
  };
}

export function toolCalls(h: Harness, name?: string) {
  return h.sent().filter((message) => message.method === "tools/call" && (!name || message.params?.name === name));
}
