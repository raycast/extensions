import { afterEach, describe, expect, it } from "vitest";
import { FolnaroError } from "../src/lib/errors";
import { McpClient, PROTOCOL_VERSION } from "../src/lib/mcp-client";
import { harness, toolCalls, type Harness } from "./helpers";

let current: Harness | undefined;
const open = (name: string, options = {}) => (current = harness(name, options));
afterEach(() => current?.client.close());

describe("McpClient", () => {
  it("runs the initialize handshake once, then notifications/initialized", async () => {
    const h = open("demo.json");
    const info = await h.client.start();
    await h.client.start();
    expect(info.protocolVersion).toBe("2025-11-25");
    expect(info.serverInfo?.name).toBe("folnaro");
    await h.api.runningTimer();
    const [initialize, initialized, call] = h.sent();
    expect(initialize).toMatchObject({
      method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "raycast" } },
    });
    expect(initialized).toEqual({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(call).toMatchObject({ method: "tools/call", params: { name: "time_running", arguments: {} } });
    expect(h.sent().filter((message) => message.method === "initialize")).toHaveLength(1);
  });

  it("reads structuredContent and keeps the other content blocks", async () => {
    const h = open("demo.json");
    const pdf = await h.api.documentPdf("D-142");
    expect(pdf.meta.file_name).toBe("RE-2026-0142.pdf");
    expect(pdf.bytes.toString()).toBe("%PDF-1.7\n");
  });

  it("answers concurrent requests by id", async () => {
    const h = open("demo.json");
    const [documents, customers, running] = await Promise.all([h.api.documents(), h.api.customers(), h.api.runningTimer()]);
    expect(documents.length).toBeGreaterThan(0);
    expect(customers[0].display_name).toBe("Nordlicht Medien GmbH");
    expect(running?.is_running).toBe(true);
  });

  it("lists the allowed tools", async () => {
    const h = open("permissions-off.json");
    const tools = await h.api.allowedTools();
    expect(tools.has("time_running")).toBe(true);
    expect(tools.has("time_start_timer")).toBe(false);
  });

  it("turns an unknown tool into a protocol error", async () => {
    const h = open("timer-not-running-de.json");
    await expect(h.client.callTool("no_such_tool")).rejects.toMatchObject({ kind: "protocol", code: -32602 });
  });

  it("times out a request the helper never answers", async () => {
    const h = open("timeout.json", { requestTimeoutMs: 300 });
    const started = Date.now();
    await expect(h.api.runningTimer()).rejects.toMatchObject({ kind: "timeout" });
    expect(Date.now() - started).toBeLessThan(3000);
    expect(toolCalls(h, "time_running")).toHaveLength(1);
  });

  it("times out a handshake that never completes", async () => {
    const h = open("hang-initialize.json", { startTimeoutMs: 300 });
    await expect(h.client.start()).rejects.toMatchObject({ kind: "timeout" });
  });

  it("reports a helper that exits in the middle of a request", async () => {
    const h = open("crash.json");
    const error = await h.api.runningTimer().catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(FolnaroError);
    expect((error as FolnaroError).kind).toBe("helperExited");
  });

  it("reports a missing helper binary", async () => {
    const client = new McpClient({ command: "/nonexistent/Folnaro.app/Contents/MacOS/folnaro-mcp" });
    await expect(client.callTool("time_running")).rejects.toMatchObject({ kind: "helperMissing" });
    client.close();
  });

  it("refuses requests after close", async () => {
    const h = open("demo.json");
    await h.client.start();
    h.client.close();
    await expect(h.api.runningTimer()).rejects.toMatchObject({ kind: "helperExited" });
  });
});
