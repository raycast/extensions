import { describe, expect, it } from "vitest";
import { KansoError, callTool, checkKey, parsePort, send } from "../client";
import { json, refused, scripted } from "./helpers";

describe("parsePort", () => {
  it("defaults when empty", () => {
    expect(parsePort(undefined)).toBe(19840);
    expect(parsePort("  ")).toBe(19840);
  });
  it("reads a port", () => expect(parsePort(" 8080 ")).toBe(8080));
  it.each(["0", "65536", "abc", "19840x", "-1", "1.5"])("rejects %s", (p) => {
    expect(() => parsePort(p)).toThrowError(/not a port/);
  });
});

describe("send", () => {
  it("says Kanso isn't open when the connection is refused and Kanso is not running", async () => {
    const { env } = scripted([refused()], false);
    const error = (await send(env, 19840, "/pair").catch((e) => e)) as KansoError;
    expect(error).toBeInstanceOf(KansoError);
    expect(error.kind).toBe("not-open");
    expect(error.message).toBe("Kanso isn't open. Open Kanso, then try again.");
  });

  it("says the local API is off when Kanso runs but refuses", async () => {
    const { env } = scripted([refused()], true);
    const error = (await send(env, 19840, "/pair").catch((e) => e)) as KansoError;
    expect(error.kind).toBe("api-off");
    expect(error.message).toBe("Kanso's local API is off. Turn it on in Kanso › Settings › Local API.");
  });

  it("treats a connection that never answers as the wrong port", async () => {
    const hang = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    const { env } = scripted([hang]);
    const error = (await send(env, 4000, "/pair").catch((e) => e)) as KansoError;
    expect(error.kind).toBe("wrong-port");
    expect(error.message).toContain("port 4000");
  });

  it("returns an undefined body for a non-JSON answer", async () => {
    const { env } = scripted([new Response("<html>nginx</html>", { status: 200 })]);
    expect(await send(env, 80, "/")).toEqual({ status: 200, body: undefined });
  });
});

describe("callTool", () => {
  const ok = (result: unknown) => json(200, { jsonrpc: "2.0", id: 1, result });

  it("sends a bearer key and returns the parsed tool result", async () => {
    const { env, calls } = scripted([ok({ content: [{ type: "text", text: '{"a":1}' }] })]);
    expect(await callTool(env, 19840, "kcl_x", "kanso-parse-when", { text: "x" })).toEqual({ a: 1 });
    expect(calls[0].url).toBe("http://127.0.0.1:19840/mcp");
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe("Bearer kcl_x");
    expect(JSON.parse(String(calls[0].init?.body)).params).toEqual({
      name: "kanso-parse-when",
      arguments: { text: "x" },
    });
  });

  it("maps 401 to unauthorized", async () => {
    const { env } = scripted([json(401, { error: "unauthorized", reason: "no" })]);
    const error = (await callTool(env, 19840, "kcl_x", "list-notes", {}).catch((e) => e)) as KansoError;
    expect(error.kind).toBe("unauthorized");
    expect(error.message).toBe("Kanso no longer knows this key. Connect again.");
  });

  it("maps a tool error to failed with Kanso's words", async () => {
    const { env } = scripted([ok({ isError: true, content: [{ type: "text", text: "No such note" }] })]);
    const error = (await callTool(env, 19840, "kcl_x", "read-note", {}).catch((e) => e)) as KansoError;
    expect(error.kind).toBe("failed");
    expect(error.message).toContain("No such note");
  });

  it("calls a non-Kanso answer the wrong port", async () => {
    const { env } = scripted([new Response("hello", { status: 200 })]);
    const error = (await callTool(env, 3000, "kcl_x", "list-notes", {}).catch((e) => e)) as KansoError;
    expect(error.kind).toBe("wrong-port");
  });
});

describe("checkKey", () => {
  it("accepts a key Kanso answers", async () => {
    const { env } = scripted([json(200, [])]);
    expect(await checkKey(env, 19840, "kcl_x")).toBe("ok");
  });
  it("reports a key Kanso does not know", async () => {
    const { env } = scripted([json(401, { error: "unauthorized", reason: "x" })]);
    expect(await checkKey(env, 19840, "kcl_x")).toBe("unauthorized");
  });
  it("throws when Kanso is not running", async () => {
    const { env } = scripted([refused()]);
    await expect(checkKey(env, 19840, "kcl_x")).rejects.toMatchObject({ kind: "not-open" });
  });
});
