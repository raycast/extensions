import { describe, it, expect, vi, afterEach } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

import { spawn } from "node:child_process";
import {
  FM_PATH,
  appleEngine,
  buildFmArgs,
  firstOllamaModel,
  friendlyFmError,
  ollamaEngine,
  readNdjson,
  resolveEngine,
  stripAnsi,
} from "../src/lib/ai-engines";

function fakeChild() {
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: () => void };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn(() => child.emit("close", null));
  return child;
}

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Apple fm", () => {
  it("builds respond arguments for on-device and Private Cloud Compute", () => {
    expect(buildFmArgs("be brief", "Question: hi", false)).toEqual([
      "respond",
      "Question: hi",
      "--instructions",
      "be brief",
    ]);
    expect(buildFmArgs("i", "p", true)).toEqual(["respond", "p", "--instructions", "i", "--model", "pcc"]);
  });

  it("streams stdout and strips terminal escapes", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);
    const seen: string[] = [];
    const promise = appleEngine(false).complete("i", "p", { onData: (t) => seen.push(t) });
    child.stdout.emit("data", Buffer.from("\u001b[1mHello"));
    child.stdout.emit("data", Buffer.from(" world\u001b[0m\n"));
    child.emit("close", 0);
    await expect(promise).resolves.toBe("Hello world");
    expect(seen.at(-1)).toBe("Hello world\n");
    expect((spawn as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(FM_PATH);
  });

  it("explains a disabled Apple Intelligence", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);
    const promise = appleEngine(false).complete("i", "p");
    child.stderr.emit("data", Buffer.from("Error: Apple Intelligence is not enabled"));
    child.emit("close", 1);
    await expect(promise).rejects.toThrow(/Turn it on in System Settings/);
  });

  it("maps other errors", () => {
    expect(friendlyFmError("Error: exceeded context window size", 1)).toMatch(/too long/);
    expect(friendlyFmError("rate limit reached", 1)).toMatch(/usage limit/);
    expect(friendlyFmError("", 3)).toBe("fm exited with code 3");
    expect(stripAnsi("\u001b[31mred\u001b[0m")).toBe("red");
  });
});

describe("Ollama", () => {
  const settings = { ollamaUrl: "http://127.0.0.1:11434/", ollamaContext: 8192 };

  it("reads NDJSON split across chunks", async () => {
    const lines: unknown[] = [];
    await readNdjson(streamOf('{"a":1}\n{"b"', ':2}\n{"c":3}'), (v) => lines.push(v));
    expect(lines).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("picks the first installed model and streams the chat", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/tags")) return new Response(JSON.stringify({ models: [{ name: "llama3.2:latest" }] }));
      return new Response(streamOf('{"message":{"content":"Hel"}}\n', '{"message":{"content":"lo"}}\n{"done":true}\n'));
    });
    vi.stubGlobal("fetch", fetchMock);
    const seen: string[] = [];
    const text = await ollamaEngine(settings).complete("sys", "user", { onData: (t) => seen.push(t) });
    expect(text).toBe("Hello");
    expect(seen).toEqual(["Hel", "Hello", "Hello"]);
    const body = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ model: "llama3.2:latest", stream: true, options: { num_ctx: 8192 } });
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "user" },
    ]);
  });

  it("says when no model is installed or Ollama isn't running", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ models: [] }))),
    );
    await expect(firstOllamaModel("http://x")).rejects.toThrow(/no models installed/);
    await expect(ollamaEngine(settings).complete("s", "u")).rejects.toThrow(/no models installed/);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(ollamaEngine({ ...settings, ollamaModel: "m" }).complete("s", "u")).rejects.toThrow(
      /Couldn't reach Ollama/,
    );
  });

  it("surfaces errors reported mid-stream", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(streamOf('{"error":"model not found"}\n'))),
    );
    await expect(ollamaEngine({ ...settings, ollamaModel: "m" }).complete("s", "u")).rejects.toThrow(
      "Ollama: model not found",
    );
  });
});

describe("resolveEngine", () => {
  const settings = { ollamaUrl: "http://127.0.0.1:11434", ollamaContext: 8192 };

  it("returns the requested engine", async () => {
    expect((await resolveEngine("apple-pcc", settings)).id).toBe("apple-pcc");
    expect((await resolveEngine("ollama", settings)).contextBudget).toBe(Math.floor(8192 * 0.6));
  });

  it("falls back through what's available in auto mode", async () => {
    // Pretend to be a non-Mac so /usr/bin/fm doesn't count, whatever machine runs the tests.
    const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
    Object.defineProperty(process, "platform", { value: "linux" });
    try {
      // No Raycast AI access in tests → a running Ollama wins…
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("{}")),
      );
      expect((await resolveEngine("auto", settings)).id).toBe("ollama");
      // …and with nothing available it falls back to Raycast AI, which offers Pro.
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new Error("down");
        }),
      );
      expect((await resolveEngine("auto", settings)).id).toBe("raycast");
    } finally {
      Object.defineProperty(process, "platform", platform);
    }
  });
});
