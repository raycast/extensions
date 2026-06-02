import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("child_process", () => ({
  execFile: vi.fn((_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
    cb(null);
  }),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ mtimeMs: 0 })),
    unlinkSync: vi.fn(),
  };
});

import { existsSync, readdirSync, statSync, unlinkSync, writeFileSync } from "fs";
import { pronounce, pronounceFallback } from "./tts";

const API_KEY = "test-key";
const TEST_MODEL = "test-tts-model";

function ttsResponseBody(base64Audio: string, mimeType = "audio/L16;rate=24000"): object {
  return {
    candidates: [
      {
        content: {
          parts: [{ inlineData: { mimeType, data: base64Audio } }],
        },
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  vi.mocked(existsSync).mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pronounce", () => {
  it("calls Gemini TTS API and plays audio", async () => {
    const fakePcm = Buffer.alloc(48).toString("base64");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(ttsResponseBody(fakePcm)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await pronounce("hello", API_KEY, "en", undefined, TEST_MODEL);

    expect(result.cached).toBe(false);
    expect(fetch).toHaveBeenCalledOnce();
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    // URL targets the Gemini TTS endpoint without snapshotting a specific model name —
    // the default may change over time as preview models are retired. It must also
    // keep credentials out of the query string.
    const url = new URL(fetchCall[0] as string);
    expect(url.origin).toBe("https://generativelanguage.googleapis.com");
    expect(url.pathname).toMatch(/^\/v1beta\/models\/[^/?#:]+:generateContent$/);
    expect(url.search).toBe("");

    const body = JSON.parse((fetchCall[1] as RequestInit).body as string);
    expect(body.contents[0].parts[0].text).toBe("hello");
    expect(body.generationConfig.responseModalities).toEqual(["AUDIO"]);
    expect(body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe("Kore");
  });

  it("uses the model passed via parameter (not a hardcoded default)", async () => {
    const fakePcm = Buffer.alloc(48).toString("base64");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(ttsResponseBody(fakePcm)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const customModel = "custom-tts-model-xyz";
    await pronounce("hello", API_KEY, "en", undefined, customModel);

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[0]).toContain(`/${customModel}:generateContent`);
  });

  it("throws model-not-found on 404 and carries the model name in cause", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"error":{"code":404,"status":"NOT_FOUND"}}', { status: 404 }));
    const customModel = "gemini-2.5-flash-preview-tts";

    await expect(pronounce("hello", API_KEY, "en", undefined, customModel)).rejects.toMatchObject({
      message: "model-not-found",
      cause: {
        kind: "model-not-found",
        surface: "tts",
        model: customModel,
      },
    });
  });

  it("skips API call when cache exists", async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      // Return true for the cache file, false for the directory check
      return String(p).endsWith(".wav");
    });

    const result = await pronounce("hello", API_KEY, "en", undefined, TEST_MODEL);

    expect(result.cached).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws invalid-api-key on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    await expect(pronounce("hello", API_KEY, "en", undefined, TEST_MODEL)).rejects.toThrow("invalid-api-key");
  });

  it("throws invalid-api-key on 403", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Forbidden", { status: 403 }));
    await expect(pronounce("hello", API_KEY, "en", undefined, TEST_MODEL)).rejects.toThrow("invalid-api-key");
  });

  it("throws network-offline on network TypeError", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
    await expect(pronounce("hello", API_KEY, "en", undefined, TEST_MODEL)).rejects.toThrow("network-offline");
  });

  it("throws request-failed on non-ok response and carries status + body in cause", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Server Error", { status: 500 }));
    await expect(pronounce("hello", API_KEY, "en", undefined, TEST_MODEL)).rejects.toMatchObject({
      message: "request-failed",
      cause: {
        kind: "request-failed",
        surface: "tts",
        status: 500,
        body: "Server Error",
      },
    });
  });

  it("throws invalid-response when body does not match the schema", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('{"unexpected":"shape"}', {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(pronounce("hello", API_KEY, "en", undefined, TEST_MODEL)).rejects.toMatchObject({
      message: "invalid-response",
      cause: expect.objectContaining({ body: expect.any(String) }),
    });
  });

  it("throws empty-response when no audio data", async () => {
    const emptyResponse = {
      candidates: [{ content: { parts: [{ inlineData: { mimeType: "audio/L16;rate=24000", data: "" } }] } }],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(emptyResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(pronounce("hello", API_KEY, "en", undefined, TEST_MODEL)).rejects.toThrow("empty-response");
  });

  it("throws invalid-response before caching when Gemini returns non-PCM audio", async () => {
    const compressedAudio = Buffer.from("not raw pcm").toString("base64");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(ttsResponseBody(compressedAudio, "audio/ogg;codec=opus")), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(pronounce("hello", API_KEY, "en", undefined, TEST_MODEL)).rejects.toMatchObject({
      message: "invalid-response",
      cause: expect.objectContaining({ kind: "invalid-response", surface: "tts" }),
    });
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("accepts L16 PCM responses with explicit codec parameter", async () => {
    const fakePcm = Buffer.alloc(48).toString("base64");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(ttsResponseBody(fakePcm, "audio/L16;codec=pcm;rate=24000")), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(pronounce("hello", API_KEY, "en", undefined, TEST_MODEL)).resolves.toEqual({ cached: false });
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it("evicts oldest files when cache exceeds MAX_CACHE_FILES", async () => {
    const fakePcm = Buffer.alloc(48).toString("base64");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(ttsResponseBody(fakePcm)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Simulate 51 cached files using the current {lang}-{modelHash8}-{wordHash32}.wav format.
    const fileNames = Array.from(
      { length: 51 },
      (_, i) => `en-deadbeef-${String(i).padStart(2, "0")}${"0".repeat(30)}.wav`,
    );
    vi.mocked(readdirSync).mockReturnValue(fileNames as unknown as ReturnType<typeof readdirSync>);
    vi.mocked(statSync).mockImplementation(
      (p) =>
        ({
          mtimeMs: Number(String(p).match(/-([0-9]{2})0{30}\.wav/)?.[1] ?? "0"),
        }) as ReturnType<typeof statSync>,
    );

    await pronounce("hello", API_KEY, "en", undefined, TEST_MODEL);

    expect(unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining("en-deadbeef-00000000000000000000000000000000.wav"),
    );
  });

  it("does not call fetch when signal is already aborted", async () => {
    const signal = AbortSignal.abort();
    await expect(pronounce("hello", API_KEY, "en", signal, TEST_MODEL)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("pronounceFallback", () => {
  it("calls macOS say with correct voice for English", async () => {
    const { execFile } = await import("child_process");
    await pronounceFallback("hello", "en");
    expect(execFile).toHaveBeenCalledWith("/usr/bin/say", ["-v", "Samantha", "hello"], expect.any(Function));
  });

  it("calls macOS say with correct voice for Ukrainian", async () => {
    const { execFile } = await import("child_process");
    await pronounceFallback("привіт", "uk");
    expect(execFile).toHaveBeenCalledWith("/usr/bin/say", ["-v", "Lesya", "привіт"], expect.any(Function));
  });
});
