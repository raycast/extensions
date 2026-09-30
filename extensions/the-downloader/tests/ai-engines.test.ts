import { describe, it, expect, vi, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import fs from "node:fs";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

import { spawn } from "node:child_process";
import {
  ENGINE_TITLES,
  EnginePreference,
  FM_PATH,
  appleAvailable,
  appleEngine,
  buildFmArgs,
  firstOllamaModel,
  friendlyFmError,
  ollamaEngine,
  parseFmAvailability,
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
  const NOT_AGREED =
    "\u001b[38;2;255;107;128mYOU HAVE NOT AGREED TO THE APPLE FOUNDATION MODELS CLI LEGAL NOTICE & TERMS.\nAgreeing to the Apple Foundation Models CLI Legal Notice & Terms applies to every user on the machine, so it must be run as a privileged user (e.g. 'sudo fm license').\n\u001b[0m";

  it("builds `fm respond` arguments: instructions, streaming, then the prompt", () => {
    expect(buildFmArgs("be brief", "Question: hi")).toEqual([
      "respond",
      "--instructions",
      "be brief",
      "--stream",
      "Question: hi",
    ]);
  });

  it("offers no Private Cloud engine: fm's only model is the on-device `system` one", () => {
    expect(Object.keys(ENGINE_TITLES)).toEqual(["raycast", "apple", "ollama"]);
  });

  it("streams stdout and strips terminal escapes", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);
    const seen: string[] = [];
    const promise = appleEngine().complete("i", "p", { onData: (t) => seen.push(t) });
    child.stdout.emit("data", Buffer.from("\u001b[1mHello"));
    child.stdout.emit("data", Buffer.from(" world\u001b[0m\n"));
    child.emit("close", 0);
    await expect(promise).resolves.toBe("Hello world");
    expect(seen.at(-1)).toBe("Hello world\n");
    expect((spawn as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(FM_PATH);
  });

  it("explains the one-time fm terms (exit 69) instead of showing the raw notice", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);
    const promise = appleEngine().complete("i", "p");
    child.stderr.emit("data", Buffer.from(NOT_AGREED));
    child.emit("close", 69);
    await expect(promise).rejects.toThrow(/sudo fm license/);
  });

  it("explains a model that's still downloading", () => {
    expect(friendlyFmError("Error: The model is not available. Try again later.", 1)).toMatch(/downloading/);
    expect(friendlyFmError("System model unavailable: modelNotReady", 1)).toMatch(/downloading/);
  });

  it("maps fm's other failures to something actionable", () => {
    expect(friendlyFmError("System model unavailable: appleIntelligenceNotEnabled", 1)).toMatch(
      /Turn it on in System Settings/,
    );
    expect(friendlyFmError("System model unavailable: deviceNotEligible", 1)).toMatch(/doesn't support/);
    expect(friendlyFmError("Error: exceeded context window size", 1)).toMatch(/too long/);
    expect(friendlyFmError("Error: exceeded context window size", 1)).not.toMatch(/Private Cloud/);
    expect(friendlyFmError("Error: rate limited", 1)).toMatch(/busy/);
    expect(friendlyFmError("Error: guardrail violation", 1)).toMatch(/declined/);
    expect(friendlyFmError("", 3)).toBe("fm exited with code 3");
    expect(stripAnsi("\u001b[31mred\u001b[0m")).toBe("red");
  });

  it("reads `fm available`", () => {
    expect(parseFmAvailability("", 0)).toEqual({ available: true });
    expect(parseFmAvailability("System model unavailable: modelNotReady\n", 1)).toEqual({
      available: false,
      reason: "modelNotReady",
    });
    expect(parseFmAvailability(NOT_AGREED, 69)).toEqual({ available: false, reason: "license" });
  });

  it("counts Apple as available only when `fm available` succeeds", async () => {
    const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
    Object.defineProperty(process, "platform", { value: "darwin" });
    const exists = vi.spyOn(fs, "existsSync").mockReturnValue(true);
    try {
      const notReady = fakeChild();
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(notReady);
      const first = appleAvailable();
      notReady.stdout.emit("data", Buffer.from("System model unavailable: modelNotReady\n"));
      notReady.emit("close", 1);
      expect(await first).toBe(false);

      const ready = fakeChild();
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(ready);
      const second = appleAvailable();
      ready.emit("close", 0);
      expect(await second).toBe(true);
      expect((spawn as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1]).toEqual(["available"]);
    } finally {
      exists.mockRestore();
      Object.defineProperty(process, "platform", platform);
    }
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
    expect((await resolveEngine("apple", settings)).id).toBe("apple");
    expect((await resolveEngine("ollama", settings)).contextBudget).toBe(Math.floor(8192 * 0.6));
  });

  it("treats a saved engine that no longer exists (Private Cloud) as Automatic", async () => {
    const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
    Object.defineProperty(process, "platform", { value: "linux" });
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("{}")),
      );
      expect((await resolveEngine("apple-pcc" as EnginePreference, settings)).id).toBe("ollama");
    } finally {
      Object.defineProperty(process, "platform", platform);
    }
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
