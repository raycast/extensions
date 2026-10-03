import { afterEach, describe, expect, it, vi } from "vitest";

import { AppleTranslateProvider } from "./apple";

const script = vi.hoisted(() => vi.fn());
vi.mock("@raycast/utils", () => ({ runAppleScript: script }));
vi.mock("@raycast/api", () => ({ environment: { isDevelopment: false } }));

const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
const query = { word: "hello", fromLanguage: "en", toLanguage: "zh-CHS" };

afterEach(() => {
  Object.defineProperty(process, "platform", platform);
  script.mockReset();
});

describe("Apple translation host boundary", () => {
  it("keeps the shortcut's nonempty lines as paragraphs and forwards cancellation", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    script.mockResolvedValue("  一\n\n二\n  ");
    const signal = new AbortController().signal;

    const result = await new AppleTranslateProvider().request(query, { signal }).next();

    expect(result.value).toMatchObject({ content: { kind: "translation", query, paragraphs: ["一", "二"] } });
    expect(result.value).not.toHaveProperty("result");
    expect(script).toHaveBeenCalledWith(expect.stringContaining("Easydict-Translate-V1.2.0"), {
      timeout: 10000,
      signal,
    });
  });

  it("returns empty content on Windows without calling AppleScript", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const result = await new AppleTranslateProvider().request(query).next();

    expect(result.value).toMatchObject({ content: { kind: "translation", query, paragraphs: [] } });
    expect(script).not.toHaveBeenCalled();
  });
});
