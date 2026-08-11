import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { callTool } from "../../src/lib/mcp-client";

describe("mcp-client callTool", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // no-op
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(json: unknown, ok = true) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      async json() {
        return json;
      },
      async text() {
        return JSON.stringify(json);
      },
    }) as unknown as typeof fetch;
  }

  it("returns the first content[0].text on success", async () => {
    mockFetch({
      jsonrpc: "2.0",
      id: 1,
      result: { content: [{ type: "text", text: "hello world" }] },
    });
    const out = await callTool("transcribe_file", { file_path: "/a.mp3" });
    expect(out).toBe("hello world");
  });

  it("throws when result.isError is true, using content[0].text as message", async () => {
    mockFetch({
      jsonrpc: "2.0",
      id: 1,
      result: { isError: true, content: [{ type: "text", text: "no model" }] },
    });
    await expect(
      callTool("transcribe_file", { file_path: "/a.mp3" }),
    ).rejects.toThrow("no model");
  });

  it("throws when error object is present", async () => {
    mockFetch({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32000, message: "bad request" },
    });
    await expect(callTool("x", {})).rejects.toThrow("bad request");
  });

  it("throws on non-ok HTTP response", async () => {
    mockFetch({ oops: 1 }, false);
    await expect(callTool("x", {})).rejects.toThrow(/MCP HTTP 500/);
  });
});
