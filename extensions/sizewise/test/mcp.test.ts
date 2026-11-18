import { describe, expect, test } from "bun:test";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { askServer, parseAnswer, requestLines, runServer } from "../src/mcp";

function answer(result: unknown) {
  return JSON.stringify({ jsonrpc: "2.0", id: 2, result });
}

describe("requestLines", () => {
  test("starts a session, then calls the tool, one message per line", () => {
    const lines = requestLines("list_folder", { scan: "/x.sizewise" })
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(lines.map((line) => line.method)).toEqual(["initialize", "notifications/initialized", "tools/call"]);
    expect(lines[1].id).toBeUndefined();
    expect(lines[2]).toMatchObject({ id: 2, params: { name: "list_folder", arguments: { scan: "/x.sizewise" } } });
  });
});

describe("parseAnswer", () => {
  const handshake = JSON.stringify({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-06-18" } });

  test("returns the tool's text", () => {
    const stdout = [handshake, answer({ content: [{ type: "text", text: "~ · 6 GB" }], isError: false }), ""].join(
      "\n",
    );
    expect(parseAnswer({ stdout, timedOut: false })).toBe("~ · 6 GB");
  });

  test("throws the tool's own explanation", () => {
    const stdout = answer({
      content: [{ type: "text", text: "Turn on Let AI assistants read scan results." }],
      isError: true,
    });
    expect(() => parseAnswer({ stdout, timedOut: false })).toThrow("Turn on Let AI assistants");
  });

  test("throws a protocol error's message", () => {
    const stdout = JSON.stringify({ jsonrpc: "2.0", id: 2, error: { code: -32602, message: "No tool named x." } });
    expect(() => parseAnswer({ stdout, timedOut: false })).toThrow("No tool named x.");
  });

  test("explains a timeout and a missing answer", () => {
    expect(() => parseAnswer({ stdout: "", timedOut: true })).toThrow("took too long");
    expect(() => parseAnswer({ stdout: handshake, timedOut: false })).toThrow("didn't answer");
  });
});

describe("askServer", () => {
  test("leaves out arguments that aren't given", async () => {
    let sent = "";
    const run = async (input: string) => {
      sent = input;
      return { stdout: answer({ content: [{ type: "text", text: "ok" }] }), timedOut: false };
    };
    expect(await askServer("largest_files", { scan: "/x.sizewise", folder: undefined }, run)).toBe("ok");
    expect(JSON.parse(sent.trimEnd().split("\n")[2]).params.arguments).toEqual({ scan: "/x.sizewise" });
  });

  test("runs a server that answers each line it reads until its input ends", async () => {
    const folder = await mkdtemp(join(tmpdir(), "mcp-"));
    const server = join(folder, "server");
    // Answers the tool call with the tool's name, as sizewise-mcp answers one message per line.
    await writeFile(
      server,
      '#!/bin/sh\nwhile read -r line; do case "$line" in *tools/call*) echo \'{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"answered"}]}}\' ;; esac; done\n',
    );
    await chmod(server, 0o755);
    expect(await askServer("find_saved_scans", {}, (input) => runServer(server, input))).toBe("answered");
  });

  test("passes on a missing server", async () => {
    await expect(runServer("/nonexistent/sizewise-mcp", "")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
