import { afterEach, describe, expect, it, vi } from "vitest";
import { checkText } from "./pangram";

const options = { apiKey: "key", model: "default", timeoutMs: 5_000 };

const success = {
  stage: "STAGE_SUCCESS",
  text: "AI-assisted passage. Human passage.",
  version: "4.0",
  headline: "AI Assisted",
  prediction: "We believe that this text is a mix of AI-assisted and human-written content.",
  prediction_short: "Mixed",
  fraction_ai: 0,
  fraction_ai_assisted: 0.6,
  fraction_human: 0.4,
  windows: [
    {
      text: "AI-assisted passage. ",
      label: "AI-Assisted",
      ai_assistance_score: 0.55,
      confidence: "High",
      word_count: 2,
      is_humanized: true,
    },
  ],
};

/** Stubs fetch with queued JSON responses (or network errors) and records each request. */
function stubFetch(...responses: ({ status?: number; body: unknown } | Error)[]) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => {
    const response = responses.shift()!;
    if (response instanceof Error) throw response;
    const { status = 200, body } = response;
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => vi.unstubAllGlobals());

describe("checkText", () => {
  it("submits the text and polls until the Check succeeds", async () => {
    const fetch = stubFetch(
      { body: { task_id: "t1" } },
      { body: { task_id: "t1", stage: "STAGE_PREPROCESSING" } },
      { body: success },
    );

    const result = await checkText("Some text", options);

    expect(result).toEqual({
      verdict: "Mixed",
      headline: "AI Assisted",
      breakdown: { ai: 0, aiAssisted: 0.6, human: 0.4 },
      modelVersion: "4.0",
      segments: [
        { text: "AI-assisted passage. ", label: "AI-Assisted", confidence: "High", wordCount: 2, isHumanized: true },
      ],
    });
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://text.external-api.pangram.com/task",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-api-key": "key" }),
        body: JSON.stringify({ text: "Some text", model: "default" }),
      }),
    );
    expect(fetch).toHaveBeenLastCalledWith("https://text.external-api.pangram.com/task/t1", expect.anything());
  });

  it.each([
    ["a 503", { status: 503, body: { detail: "Unavailable" } }],
    ["a network error", new TypeError("fetch failed")],
  ])("keeps polling the same task after %s", async (_, failure) => {
    const fetch = stubFetch({ body: { task_id: "t1" } }, failure, { body: success });

    await expect(checkText("Some text", options)).resolves.toMatchObject({ verdict: "Mixed" });
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("fails without retrying when a poll is rejected", async () => {
    stubFetch({ body: { task_id: "t1" } }, { status: 401, body: { detail: "Invalid API key" } });

    await expect(checkText("Some text", options)).rejects.toMatchObject({ name: "PangramError", status: 401 });
  });

  it("fails with Pangram's headline when the task fails", async () => {
    stubFetch(
      { body: { task_id: "t1" } },
      { body: { stage: "STAGE_FAILED", headline: "preprocessing: Input text contains no valid text" } },
    );

    await expect(checkText("…", options)).rejects.toThrow("preprocessing: Input text contains no valid text");
  });

  it.each([401, 402, 429])("fails with the HTTP status when the API answers %i", async (status) => {
    stubFetch({ status, body: { detail: "Nope" } });

    await expect(checkText("Some text", options)).rejects.toMatchObject({ name: "PangramError", status });
  });

  it("gives up when the Check outlasts the timeout", async () => {
    stubFetch({ body: { task_id: "t1" } }, { body: { stage: "STAGE_PREPROCESSING" } });

    await expect(checkText("Some text", { ...options, timeoutMs: 50 })).rejects.toThrow(
      "Pangram didn't finish within 0.05 s",
    );
  });
});
