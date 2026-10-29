import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getArticleId,
  fetchArticleList,
  fetchArticleDetail,
  searchArticlesByTag,
  classifyError,
} from "../api/client";
import { Article } from "../api/type";

const article = (over: Partial<Article> = {}): Article =>
  ({ id: 98097, titulo: "t", url: "/u", ...over }) as Article;

describe("getArticleId", () => {
  it("uses the id the API already provides", () => {
    expect(getArticleId(article({ id: 98097 }))).toBe("98097");
  });

  it("does not read the id out of the URL", () => {
    // Video URLs end in -YYYYMMDD-HHMMSS. The previous implementation parsed
    // the URL and returned the time component, 155509, which is itself a
    // valid article id (a 2002 article), so the detail pane silently showed
    // another article's author, date and summary.
    const video = article({
      id: 98097,
      url: "https://www.publico.pt/2026/08/04/video/mamdani-nao-20260804-155509",
    });
    expect(getArticleId(video)).toBe("98097");
    expect(getArticleId(video)).not.toBe("155509");
  });

  it("handles ids shorter than six digits", () => {
    // These matched no URL pattern before, so the item was never enriched.
    expect(getArticleId(article({ id: 906 }))).toBe("906");
  });

  it("returns null when the API gives no id", () => {
    expect(getArticleId({ titulo: "t", url: "/u" } as Article)).toBeNull();
    expect(getArticleId(article({ id: 0 }))).toBeNull();
  });
});

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body,
  text: async () => JSON.stringify(body),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("classifyError", () => {
  it("explains a timeout in plain language", () => {
    const timeout = Object.assign(new Error("x"), { name: "TimeoutError" });
    expect(classifyError(timeout, "Ctx").message).toContain("took too long");
  });

  it("passes an AbortError through untouched, so callers can ignore it", () => {
    const abort = Object.assign(new Error("x"), { name: "AbortError" });
    expect(classifyError(abort, "Ctx")).toBe(abort);
  });

  it("does not report an ordinary Error as a connectivity problem", () => {
    const plain = new Error("something else");
    expect(classifyError(plain, "Ctx").message).not.toContain("internet");
  });

  it("keeps the original cause instead of discarding it", () => {
    const network = new TypeError("fetch failed");
    const classified = classifyError(network, "Ctx");
    expect(classified.message).toContain("internet");
    expect(classified.cause).toBe(network);
  });
});

describe("fetchArticleList", () => {
  it("reports the HTTP status when the response is not ok", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
    }));
    await expect(
      fetchArticleList("https://x/api/list/y", "Ctx"),
    ).rejects.toThrow(/404/);
  });

  it("returns an empty array when the body is not an array", async () => {
    // A WAF or maintenance page can return 200 with an object or HTML.
    vi.stubGlobal("fetch", async () => ok({ message: "nope" }));
    await expect(fetchArticleList("https://x", "Ctx")).resolves.toEqual([]);
  });

  it("drops items that are missing the fields the UI needs", async () => {
    vi.stubGlobal("fetch", async () =>
      ok([{ titulo: "keep", url: "/a" }, { titulo: "drop, no url" }]),
    );
    const articles = await fetchArticleList("https://x", "Ctx");
    expect(articles).toHaveLength(1);
    expect(articles[0].titulo).toBe("keep");
  });
});

describe("fetchArticleDetail", () => {
  it("returns null for an empty body rather than throwing", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    }));
    await expect(fetchArticleDetail("123")).resolves.toBeNull();
  });

  it("returns null for truncated JSON rather than throwing", async () => {
    // This is the failure the function exists to survive: Publico has
    // returned oversized and broken payloads before.
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => '{"id":1,"titulo":"trunc',
    }));
    await expect(fetchArticleDetail("123")).resolves.toBeNull();
  });
});

describe("searchArticlesByTag", () => {
  it("falls back to the stopword-stripped slug when the first is empty", async () => {
    const requested: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      requested.push(url);
      return ok(
        url.includes("guerra-ucrania") ? [{ titulo: "hit", url: "/a" }] : [],
      );
    });
    const articles = await searchArticlesByTag("guerra na ucrânia");
    expect(requested.some((url) => url.includes("guerra-na-ucrania"))).toBe(
      true,
    );
    expect(requested.some((url) => url.includes("guerra-ucrania"))).toBe(true);
    expect(articles).toHaveLength(1);
  });

  it("returns an empty array when no candidate matches", async () => {
    vi.stubGlobal("fetch", async () => ok([]));
    await expect(searchArticlesByTag("preço da habitação")).resolves.toEqual(
      [],
    );
  });
});
