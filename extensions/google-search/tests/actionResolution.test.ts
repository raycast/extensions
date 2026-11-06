import { describe, expect, it } from "vitest";
import { getSearchModeActions } from "../src/utils/resultUtils";
import { SearchResult } from "../src/utils/types";

describe("actionResolution - Search Mode Action Panels and Shortcuts", () => {
  const sampleSearchItem: SearchResult = {
    id: "item-1",
    query: "vitest mocking",
    description: "Search Google for 'vitest mocking'",
    url: "https://www.google.com/search?q=vitest%20mocking",
  };

  const sampleNavItem: SearchResult = {
    id: "nav-1",
    query: "vitest.dev",
    description: "Open URL",
    url: "https://vitest.dev",
    isNavigation: true,
  };

  describe("Regular Search Mode (default)", () => {
    it("assigns Open in Browser as primary action (Enter)", () => {
      const actions = getSearchModeActions("default", sampleSearchItem);
      expect(actions.primaryAction.title).toBe("Open in Browser");
      expect(actions.primaryAction.url).toBe("https://www.google.com/search?q=vitest%20mocking");
      expect(actions.primaryAction.shortcut).toBeUndefined(); // default Return
    });

    it("preserves Cmd+Enter / Ctrl+Enter for Copy URL to Clipboard as second action (Finding 1)", () => {
      const actions = getSearchModeActions("default", sampleSearchItem);

      // In action order, index 0 is primary, index 1 is Copy URL
      expect(actions.actionOrder[0].id).toBe("open-normal");
      expect(actions.actionOrder[1].id).toBe("copy-url");
      expect(actions.actionOrder[1].title).toBe("Copy URL to Clipboard");
      expect(actions.actionOrder[1].shortcut).toEqual({
        macOS: { modifiers: ["cmd"], key: "return" },
        Windows: { modifiers: ["ctrl"], key: "return" },
      });
      expect(actions.actionOrder[1].content).toBe("https://www.google.com/search?q=vitest%20mocking");
    });

    it("assigns Shift+Enter to Search in AI Mode as third action", () => {
      const actions = getSearchModeActions("default", sampleSearchItem);
      expect(actions.actionOrder[2].id).toBe("open-ai");
      expect(actions.actionOrder[2].title).toBe("Search in AI Mode");
      expect(actions.actionOrder[2].shortcut).toEqual({ modifiers: ["shift"], key: "return" });
      expect(actions.actionOrder[2].url).toBe("https://www.google.com/search?q=vitest%20mocking&udm=50");
    });

    it("displays Search in AI Mode (⇧↵) as accessory hint (Finding 4)", () => {
      const actions = getSearchModeActions("default", sampleSearchItem);
      expect(actions.accessory.icon).toBe("stars");
      expect(actions.accessory.tooltip).toBe("Search in AI Mode (⇧↵)");
    });
  });

  describe("AI Search Mode (ai)", () => {
    it("assigns Search in AI Mode as primary action (Enter)", () => {
      const actions = getSearchModeActions("ai", sampleSearchItem);
      expect(actions.primaryAction.title).toBe("Search in AI Mode");
      expect(actions.primaryAction.url).toBe("https://www.google.com/search?q=vitest%20mocking&udm=50");
      expect(actions.primaryAction.shortcut).toBeUndefined(); // default Return
    });

    it("preserves Cmd+Enter / Ctrl+Enter for Copy URL to Clipboard as second action copying AI URL (Finding 1 & Finding 3)", () => {
      const actions = getSearchModeActions("ai", sampleSearchItem);

      expect(actions.actionOrder[0].id).toBe("open-ai");
      expect(actions.actionOrder[1].id).toBe("copy-url");
      expect(actions.actionOrder[1].title).toBe("Copy URL to Clipboard");
      expect(actions.actionOrder[1].shortcut).toEqual({
        macOS: { modifiers: ["cmd"], key: "return" },
        Windows: { modifiers: ["ctrl"], key: "return" },
      });
      // Copied link must have udm=50 in AI mode
      expect(actions.actionOrder[1].content).toBe("https://www.google.com/search?q=vitest%20mocking&udm=50");
      expect(actions.actionOrder[1].content).toContain("&udm=50");
    });

    it("assigns Shift+Enter to Open in Browser as third action", () => {
      const actions = getSearchModeActions("ai", sampleSearchItem);
      expect(actions.actionOrder[2].id).toBe("open-normal");
      expect(actions.actionOrder[2].title).toBe("Open in Browser");
      expect(actions.actionOrder[2].shortcut).toEqual({ modifiers: ["shift"], key: "return" });
      expect(actions.actionOrder[2].url).toBe("https://www.google.com/search?q=vitest%20mocking");
    });

    it("displays Open in Browser (⇧↵) as accessory hint, NOT AI Mode (Finding 4 / Bugbot)", () => {
      const actions = getSearchModeActions("ai", sampleSearchItem);
      expect(actions.accessory.icon).toBe("arrow-right");
      expect(actions.accessory.tooltip).toBe("Open in Browser (⇧↵)");
    });
  });

  describe("Navigation Items Behavior in Both Modes (Finding 2)", () => {
    it("opens destination URL in regular mode", () => {
      const actions = getSearchModeActions("default", sampleNavItem);
      expect(actions.primaryAction.url).toBe("https://vitest.dev");
      expect(actions.copyUrlAction.content).toBe("https://vitest.dev");
    });

    it("opens destination URL in AI mode (does not transform website into search query)", () => {
      const actions = getSearchModeActions("ai", sampleNavItem);
      // Destination URL must NOT be https://www.google.com/search?q=vitest.dev&udm=50
      expect(actions.primaryAction.url).toBe("https://vitest.dev");
      expect(actions.copyUrlAction.content).toBe("https://vitest.dev");
    });
  });
});
