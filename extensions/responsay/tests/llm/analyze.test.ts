import { describe, it, expect, vi } from "vitest";
import { analyze } from "../../src/llm/analyze";
import { EXAMPLE } from "../../src/__fixtures__/analysis";
import type { ChatConfig } from "../../src/llm/client";

const cfg: ChatConfig = { baseURL: "b", apiKey: "k", model: "m" };
const good = JSON.stringify(EXAMPLE);
const INPUT = EXAMPLE.text; // analysis is validated against the input it was given

// A schema-valid but content-broken reply: same sentence, but "call" dropped,
// so the annotated words no longer reconstruct the text.
const contentBad = JSON.parse(JSON.stringify(EXAMPLE));
contentBad.thoughtGroups[1].words.pop();
const bad = JSON.stringify(contentBad);

describe("analyze", () => {
  it("returns parsed analysis on first valid response", async () => {
    const chat = vi.fn(async () => good);
    const out = await analyze(INPUT, { isWord: false, accent: "GA" }, cfg, {
      chat,
    });
    expect(out.text).toBe(EXAMPLE.text);
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it("retries once with a repair instruction when first response is invalid JSON", async () => {
    const chat = vi
      .fn()
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce(good);
    const out = await analyze(INPUT, { isWord: false, accent: "GA" }, cfg, {
      chat,
    });
    expect(out.thoughtGroups.length).toBe(2);
    expect(chat).toHaveBeenCalledTimes(2);
    expect(chat.mock.calls[1][2] as string).toContain("invalid");
  });

  it("throws if the repair attempt is also invalid JSON", async () => {
    const chat = vi.fn(async () => "still not json");
    await expect(
      analyze("x", { isWord: false, accent: "GA" }, cfg, { chat }),
    ).rejects.toBeTruthy();
  });

  it("repairs a content-broken (but schema-valid) analysis once", async () => {
    const chat = vi
      .fn()
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(good);
    const out = await analyze(INPUT, { isWord: false, accent: "GA" }, cfg, {
      chat,
    });
    expect(out.thoughtGroups.flatMap((g) => g.words).length).toBe(8); // "call" restored
    expect(chat).toHaveBeenCalledTimes(2);
    expect(chat.mock.calls[1][2] as string).toContain("problems");
  });

  it("accepts best-effort (no throw) if content stays broken after repair", async () => {
    const chat = vi.fn(async () => bad);
    const out = await analyze(INPUT, { isWord: false, accent: "GA" }, cfg, {
      chat,
    });
    expect(out.text).toBe(EXAMPLE.text);
    expect(chat).toHaveBeenCalledTimes(2);
  });
});
