import { LocalStorage } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DictionaryType } from "@/core/results/kinds";
import { RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";

vi.mock("@raycast/api", () => ({
  environment: { isDevelopment: false },
  LocalStorage: { getItem: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));
vi.mock("@/consts", () => ({ myPreferences: { enableYoudaoDictionary: true, enableYoudaoTranslate: true } }));
vi.mock("@/shared/http", () => ({
  timedFetch: Object.assign(vi.fn(), { raw: vi.fn().mockResolvedValue({ headers: new Headers() }) }),
}));

beforeEach(() => vi.clearAllMocks());

const query = { word: "good", fromLanguage: "en", toLanguage: "zh-CHS" };

describe("Youdao dictionary request", () => {
  it("requests only dictionary content without loading unused cookies or retaining the vendor response", async () => {
    const { YoudaoDictionaryProvider } = await import("./index");
    vi.mocked(timedFetch).mockResolvedValueOnce({
      input: "good",
      le: "en",
      web_trans: { "web-translation": [{ key: "good", trans: [{ value: "好的" }] }] },
      collins: { unused: "vendor payload" },
    });
    const signal = new AbortController().signal;

    const result = await new YoudaoDictionaryProvider().request(query, { signal });

    expect(LocalStorage.getItem).not.toHaveBeenCalled();
    expect(timedFetch.raw).not.toHaveBeenCalled();
    expect(timedFetch).toHaveBeenCalledOnce();
    expect(timedFetch).toHaveBeenCalledWith(expect.stringContaining("https://dict.youdao.com/jsonapi?"), { signal });
    expect(result).toMatchObject({
      type: DictionaryType.Youdao,
      content: {
        kind: "dictionary",
        sections: [
          { kind: "translation", text: "好的" },
          { kind: "pairs", relation: "web-translation", entries: [{ expression: "good", meaning: "好的" }] },
        ],
      },
    });
    expect(result).not.toHaveProperty("result");
    expect(JSON.stringify(result)).not.toContain("vendor payload");
  });

  it("normalizes an invalid top-level response to a provider error", async () => {
    const { YoudaoDictionaryProvider } = await import("./index");
    vi.mocked(timedFetch).mockResolvedValueOnce(null);

    await expect(new YoudaoDictionaryProvider().request(query)).rejects.toMatchObject({
      constructor: RequestError,
      type: DictionaryType.Youdao,
      message: "Invalid Youdao dictionary response",
    });
  });
});
