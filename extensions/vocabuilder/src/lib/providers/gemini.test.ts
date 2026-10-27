import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { geminiJsonTransport } from "./gemini";
import type { ProviderConfig } from "./types";

const CONFIG: ProviderConfig = { provider: "gemini", apiKey: "key", model: "gemini-3.5-flash", baseUrl: "" };
const SCHEMA = { type: "object", properties: { translation: { type: "string" } }, required: ["translation"] };

function okResponse(text: string): Response {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("geminiJsonTransport", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okResponse('{"translation":"x"}')),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts generateContent with the key in a header and structured JSON output requested", async () => {
    await geminiJsonTransport(CONFIG, { prompt: "hi", schema: SCHEMA });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
    );
    expect(parsed.search).toBe("");
    expect(init?.headers).toEqual({ "Content-Type": "application/json", "x-goog-api-key": "key" });
    expect(JSON.parse(init?.body as string)).toEqual({
      contents: [{ parts: [{ text: "hi" }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: SCHEMA },
    });
  });

  it("returns the model's JSON text with code fences stripped", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse('```json\n{"translation":"x"}\n```'));
    await expect(geminiJsonTransport(CONFIG, { prompt: "hi", schema: SCHEMA })).resolves.toBe('{"translation":"x"}');
  });

  it("sends the request to a custom base URL", async () => {
    await geminiJsonTransport({ ...CONFIG, baseUrl: "http://localhost:4000" }, { prompt: "hi", schema: SCHEMA });
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "http://localhost:4000/v1beta/models/gemini-3.5-flash:generateContent",
    );
  });

  it("trims custom model IDs before building the request", async () => {
    await geminiJsonTransport({ ...CONFIG, model: " gemini-3.5-flash " }, { prompt: "hi", schema: SCHEMA });
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("/gemini-3.5-flash:generateContent");
  });

  it.each(["http://gw.corp/v1beta/models", "https://user:pass@gw.corp"])(
    "rejects an unusable base URL before issuing a request: %s",
    async (baseUrl) => {
      await expect(geminiJsonTransport({ ...CONFIG, baseUrl }, { prompt: "hi", schema: SCHEMA })).rejects.toMatchObject(
        { cause: { domain: "infrastructure", kind: "invalid-base-url", surface: "translate", provider: "gemini" } },
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  // Pins the resolved base URL threading into the error: passing the full
  // request URL instead would name a host built from the model segment.
  it("names the endpoint host when a custom base URL returns 404", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Not Found", { status: 404 }));
    await expect(
      geminiJsonTransport(
        { ...CONFIG, baseUrl: "https://gw.corp:8443/gemini/v1beta/models" },
        { prompt: "hi", schema: SCHEMA },
      ),
    ).rejects.toMatchObject({ cause: { kind: "model-not-found", endpointHost: "gw.corp:8443" } });
  });

  it("maps an envelope that is not a Gemini response to invalid-response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"unexpected":"shape"}', { status: 200 }));
    await expect(geminiJsonTransport(CONFIG, { prompt: "hi", schema: SCHEMA })).rejects.toMatchObject({
      cause: { kind: "invalid-response", provider: "gemini" },
    });
  });
});
