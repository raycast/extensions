import { beforeEach, describe, expect, it, vi } from "vitest";

import { CancelledError } from "@/shared/errors";

import { DeepLXTranslateProvider } from "./deepLX";

const mocks = vi.hoisted(() => ({ storage: new Map<string, string>(), translate: vi.fn(), cookies: vi.fn() }));
vi.mock("@raycast/api", () => ({
  environment: { isDevelopment: false },
  Cache: class {
    get(key: string) {
      return mocks.storage.get(key);
    }
    set(key: string, value: string) {
      mocks.storage.set(key, value);
    }
    remove(key: string) {
      mocks.storage.delete(key);
    }
  },
}));
vi.mock("@deeplx/core", () => ({ translate: mocks.translate, getSharedCookies: mocks.cookies }));
const query = { word: "hello", fromLanguage: "en", toLanguage: "zh-CHS" };

beforeEach(() => {
  mocks.storage.clear();
  mocks.translate.mockReset().mockResolvedValue("一\n\n二");
  mocks.cookies.mockReset().mockReturnValue("");
});

describe("DeepLX cookie persistence", () => {
  it.each([
    "{bad",
    JSON.stringify({ cookies: "old" }),
    JSON.stringify({ cookies: 42, timestamp: Date.now() }),
    JSON.stringify({ cookies: "old", timestamp: Date.now() - 13 * 60 * 60 * 1000 }),
  ])("ignores invalid or expired persisted cookies (%s)", async (cached) => {
    mocks.storage.set("DeepLXCookies", cached);
    await new DeepLXTranslateProvider().request(query).next();
    expect(mocks.translate).toHaveBeenCalledWith(
      "hello",
      "ZH-HANS",
      "EN",
      expect.objectContaining({ cookies: undefined }),
    );
  });

  it("reuses valid cookies and stores only changed shared cookies", async () => {
    const cached = JSON.stringify({ cookies: "valid", timestamp: Date.now() });
    mocks.storage.set("DeepLXCookies", cached);
    mocks.cookies.mockReturnValue("valid");
    const result = await new DeepLXTranslateProvider().request(query).next();
    expect(result.value).toMatchObject({ content: { paragraphs: ["一", "", "二"] } });
    expect(mocks.translate).toHaveBeenCalledWith(
      "hello",
      "ZH-HANS",
      "EN",
      expect.objectContaining({ cookies: "valid" }),
    );
    expect(mocks.storage.get("DeepLXCookies")).toBe(cached);
    mocks.cookies.mockReturnValue("renewed");
    await new DeepLXTranslateProvider().request(query).next();
    expect(JSON.parse(mocks.storage.get("DeepLXCookies")!)).toMatchObject({ cookies: "renewed" });
  });

  it.each([false, true])(
    "clears failed cookies only when the request was not cancelled (cancelled=%s)",
    async (cancelled) => {
      const cached = JSON.stringify({ cookies: "valid", timestamp: Date.now() });
      mocks.storage.set("DeepLXCookies", cached);
      const controller = new AbortController();
      mocks.translate.mockImplementation(async () => {
        if (cancelled) controller.abort();
        throw new Error("failed");
      });
      const pending = new DeepLXTranslateProvider().request(query, { signal: controller.signal }).next();
      if (cancelled) await expect(pending).rejects.toBeInstanceOf(CancelledError);
      else await expect(pending).rejects.toMatchObject({ name: "RequestError" });
      expect(mocks.storage.get("DeepLXCookies")).toBe(cancelled ? cached : undefined);
    },
  );
});
