import { describe, expect, it } from "vitest";
import { getActiveBrowserTab, getActiveBrowserTabs } from "./browser.js";

describe("getActiveBrowserTab", () => {
  it("returns the active HTTP tab from a supported browser", () => {
    const tab = getActiveBrowserTab({
      applicationName: "Google Chrome",
      tabs: [
        { id: 1, url: "https://example.com/background", active: false },
        {
          id: 2,
          url: "https://example.com/article",
          title: "Article",
          active: true,
        },
      ],
    });

    expect(tab).toEqual({
      id: 2,
      url: "https://example.com/article",
      title: "Article",
      active: true,
    });
  });

  it("returns the active HTTP tab from Aside", () => {
    expect(
      getActiveBrowserTab({
        applicationName: "Aside",
        tabs: [{ id: 1, url: "https://example.com/article", active: true }],
      }),
    ).toEqual({ id: 1, url: "https://example.com/article", active: true });
  });

  it("rejects unsupported frontmost applications", () => {
    expect(() =>
      getActiveBrowserTab({
        applicationName: "Notes",
        tabs: [],
      }),
    ).toThrow("supported browser");
  });

  it("returns all active tabs so the UI can ask which browser window to save", () => {
    expect(
      getActiveBrowserTabs({
        applicationName: "Safari",
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
        applicationName: "Safari",
        tabs: [
          { id: 1, url: "chrome://newtab", active: true },
          { id: 2, url: "https://example.com/article", active: true },
        ],
      }),
    ).toEqual([{ id: 2, url: "https://example.com/article", active: true }]);
  });

  it("rejects browser tabs without HTTP or HTTPS URLs", () => {
    expect(() =>
      getActiveBrowserTab({
        applicationName: "Safari",
        tabs: [{ id: 1, url: "chrome://newtab", active: true }],
      }),
    ).toThrow("Only HTTP and HTTPS");
  });
});
