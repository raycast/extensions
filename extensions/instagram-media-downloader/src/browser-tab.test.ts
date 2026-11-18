import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserExtension, environment } from "@raycast/api";
// `vi.mock` calls below are hoisted above this import, so it loads against the fakes.
import { readPostFromBrowser, readReelFromBrowser } from "./browser-tab";

vi.mock("@raycast/api", () => ({
  BrowserExtension: { getTabs: vi.fn(), getContent: vi.fn() },
  environment: { canAccess: vi.fn(() => true) },
}));

const CODE = "AbCdEfGhIjK";
const REF = { shortcode: CODE, kind: "post" as const };
const LATER = (Math.floor(Date.now() / 1000) + 86400).toString(16);
const PAGE = `<script type="application/json">${JSON.stringify({
  code: CODE,
  media_type: 1,
  image_versions2: { candidates: [{ url: `https://scontent.example/a.jpg?oe=${LATER}`, width: 1080, height: 1350 }] },
})}</script>`;

const tab = (id: number, url: string, active = false) => ({ id, url, active });
const getTabs = vi.mocked(BrowserExtension.getTabs);
const getContent = vi.mocked(BrowserExtension.getContent);
const canAccess = vi.mocked(environment.canAccess);

beforeEach(() => {
  getTabs.mockReset();
  getContent.mockReset();
  canAccess.mockReset().mockReturnValue(true);
});
afterEach(() => vi.useRealTimers());

describe("readPostFromBrowser", () => {
  it("reads the matching tab, preferring the active one, and never another post's tab", async () => {
    getTabs.mockResolvedValue([
      tab(1, "https://www.instagram.com/p/ZzZzZzZzZzZ/", true),
      tab(2, `https://www.instagram.com/p/${CODE}/`),
      tab(3, `https://www.instagram.com/example_user/p/${CODE}/?igsh=x`, true),
    ]);
    getContent.mockResolvedValue(PAGE);

    const result = await readPostFromBrowser(REF);

    expect(result).toMatchObject({ ok: true, media: [{ kind: "image" }] });
    expect(getContent).toHaveBeenCalledTimes(1);
    expect(getContent).toHaveBeenCalledWith({ format: "html", tabId: 3 });
  });

  it("reads the next matching tab when the preferred one holds only part of the post", async () => {
    getTabs.mockResolvedValue([
      tab(1, `https://www.instagram.com/p/${CODE}/`, true),
      tab(2, `https://www.instagram.com/p/${CODE}/`, true),
    ]);
    getContent.mockResolvedValueOnce("<html>stub</html>").mockResolvedValueOnce(PAGE);

    expect(await readPostFromBrowser(REF)).toMatchObject({ ok: true, media: [{ kind: "image" }] });
    expect(getContent).toHaveBeenNthCalledWith(2, { format: "html", tabId: 2 });
  });

  it("reports the preferred tab's miss when no matching tab has the post", async () => {
    getTabs.mockResolvedValue([
      tab(1, `https://www.instagram.com/p/${CODE}/`, true),
      tab(2, `https://www.instagram.com/p/${CODE}/`),
    ]);
    getContent.mockResolvedValue("<html>stub</html>");
    expect(await readPostFromBrowser(REF)).toEqual({ ok: false, reason: "not-found" });
    expect(getContent).toHaveBeenCalledTimes(2);
  });

  it("misses without reading anything when no tab shows this post", async () => {
    getTabs.mockResolvedValue([tab(1, "https://www.instagram.com/p/ZzZzZzZzZzZ/", true)]);
    expect(await readPostFromBrowser(REF)).toEqual({ ok: false, reason: "no-tab" });
    expect(getContent).not.toHaveBeenCalled();
  });

  it("misses when the browser extension is not available", async () => {
    canAccess.mockReturnValue(false);
    expect(await readPostFromBrowser(REF)).toEqual({ ok: false, reason: "unavailable" });
    expect(getTabs).not.toHaveBeenCalled();
  });

  it("turns a synchronous throw from the host into a miss", async () => {
    canAccess.mockImplementation(() => {
      throw new Error("host gone");
    });
    // A host that can't even say whether the extension exists has no usable extension.
    expect(await readPostFromBrowser(REF)).toEqual({ ok: false, reason: "unavailable" });

    canAccess.mockReturnValue(true);
    getTabs.mockImplementation(() => {
      throw new Error("sync boom");
    });
    expect(await readPostFromBrowser(REF)).toEqual({ ok: false, reason: "error", detail: "sync boom" });
  });

  it("gives up on a tab read that never answers, and ignores its late rejection", async () => {
    vi.useFakeTimers();
    getTabs.mockResolvedValue([tab(1, `https://www.instagram.com/p/${CODE}/`, true)]);
    let rejectLate: (error: Error) => void = () => {};
    getContent.mockReturnValue(new Promise((_, reject) => (rejectLate = reject)));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    const pending = readPostFromBrowser(REF);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await pending).toEqual({ ok: false, reason: "timeout" });

    rejectLate(new Error("too late"));
    await vi.advanceTimersByTimeAsync(0);
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("passes the page's own miss reason through", async () => {
    getTabs.mockResolvedValue([tab(1, `https://www.instagram.com/reel/${CODE}/`, true)]);
    getContent.mockResolvedValue("<html><body>Log in</body></html>");
    expect(await readPostFromBrowser(REF)).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("readReelFromBrowser", () => {
  const STORY_PAGE = `<script type="application/json">${JSON.stringify({
    reels_media: [
      {
        reel_type: "user_reel",
        user: { username: "example_user" },
        items: [
          {
            pk: "2",
            media_type: 1,
            image_versions2: { candidates: [{ url: `https://scontent.example/s.jpg?oe=${LATER}` }] },
          },
        ],
      },
    ],
  })}</script>`;

  it("reads a tab on the same user's stories even after it moved on to another story", async () => {
    getTabs.mockResolvedValue([
      tab(1, "https://www.instagram.com/stories/someone_else/2/", true),
      tab(2, "https://www.instagram.com/p/AbCdEfGhIjK/"),
      tab(3, "https://www.instagram.com/stories/Example_User/3/"),
    ]);
    getContent.mockResolvedValue(STORY_PAGE);

    const result = await readReelFromBrowser({ kind: "story", user: "example_user", storyId: "2" });
    expect(result).toMatchObject({ ok: true, items: [{ id: "2", kind: "image" }] });
    expect(getContent).toHaveBeenCalledTimes(1);
    expect(getContent).toHaveBeenCalledWith({ format: "html", tabId: 3 });
  });

  it("never reads a different highlight's tab", async () => {
    getTabs.mockResolvedValue([tab(1, "https://www.instagram.com/stories/highlights/222/", true)]);
    expect(await readReelFromBrowser({ kind: "highlight", highlightId: "111" })).toEqual({
      ok: false,
      reason: "no-tab",
    });
    expect(getContent).not.toHaveBeenCalled();
  });
});
