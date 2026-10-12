import { describe, expect, it } from "vitest";
import { getActiveBrowserTabs } from "./browser.js";

describe("getActiveBrowserTabs", () => {
  it("returns the active HTTP tab", () => {
    expect(
      getActiveBrowserTabs({
        tabs: [
          { id: 1, url: "https://example.com/background", active: false },
          {
            id: 2,
            url: "https://example.com/article",
            title: "Article",
            active: true,
          },
        ],
      }),
    ).toEqual([
      {
        id: 2,
        url: "https://example.com/article",
        title: "Article",
        active: true,
      },
    ]);
  });

  it("accepts any browser connected to the Raycast Browser Extension", () => {
    expect(
      getActiveBrowserTabs({
        tabs: [{ id: 1, url: "https://example.com/article", active: true }],
      }),
    ).toEqual([{ id: 1, url: "https://example.com/article", active: true }]);
  });

  it("returns all active tabs so the UI can ask which browser window to save", () => {
    expect(
      getActiveBrowserTabs({
        tabs: [
          { id: 1, url: "https://example.com/one", title: "One", active: true },
          { id: 2, url: "https://example.com/two", title: "Two", active: true },
        ],
      }),
    ).toHaveLength(2);
  });

  it("ignores non-web tabs when a browser window has a savable tab", () => {
    expect(
      getActiveBrowserTabs({
        tabs: [
          { id: 1, url: "chrome://newtab", active: true },
          { id: 2, url: "https://example.com/article", active: true },
        ],
      }),
    ).toEqual([{ id: 2, url: "https://example.com/article", active: true }]);
  });

  it("rejects browser tabs without HTTP or HTTPS URLs", () => {
    expect(() =>
      getActiveBrowserTabs({
        tabs: [{ id: 1, url: "chrome://newtab", active: true }],
      }),
    ).toThrow("Only HTTP and HTTPS");
  });

  it("rejects tabs whose URL cannot be parsed", () => {
    expect(() =>
      getActiveBrowserTabs({
        tabs: [{ id: 1, url: "not a url", active: true }],
      }),
    ).toThrow("Only HTTP and HTTPS");
  });

  it("reports when no browser tab is active", () => {
    expect(() =>
      getActiveBrowserTabs({
        tabs: [{ id: 1, url: "https://example.com", active: false }],
      }),
    ).toThrow("No active browser tab found");
  });
});
