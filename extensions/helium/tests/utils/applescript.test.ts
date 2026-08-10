import { describe, expect, it } from "vitest";
import { parseHeliumTabs } from "../../src/utils/applescript-parser";

const fieldSep = String.fromCharCode(31);
const recordSep = String.fromCharCode(30);

describe("parseHeliumTabs", () => {
  it("parses bulk AppleScript output", () => {
    const raw = [
      ["tab-1", "https://example.com", "Example"].join(fieldSep),
      ["tab-2", "file:///tmp/report.pdf", "Report"].join(fieldSep),
    ].join(recordSep);

    expect(parseHeliumTabs(raw)).toEqual([
      { heliumId: "tab-1", url: "https://example.com", title: "Example" },
      { heliumId: "tab-2", url: "file:///tmp/report.pdf", title: "Report" },
    ]);
  });

  it("ignores empty and malformed records", () => {
    const raw = ["", ["tab-1", "https://example.com"].join(fieldSep), ["missing-url"].join(fieldSep)].join(recordSep);

    expect(parseHeliumTabs(raw)).toEqual([{ heliumId: "tab-1", url: "https://example.com", title: "" }]);
  });

  it("keeps tabs with empty URLs", () => {
    const raw = ["tab-1", "", "New Tab"].join(fieldSep);

    expect(parseHeliumTabs(raw)).toEqual([{ heliumId: "tab-1", url: "", title: "New Tab" }]);
  });

  it("parses a 50-tab bulk AppleScript payload", () => {
    const raw = Array.from({ length: 50 }, (_, index) => {
      const tabNumber = index + 1;
      return [`tab-${tabNumber}`, `https://example.com/${tabNumber}`, `Tab ${tabNumber}`].join(fieldSep);
    }).join(recordSep);

    const tabs = parseHeliumTabs(raw);

    expect(tabs).toHaveLength(50);
    expect(tabs[0]).toEqual({ heliumId: "tab-1", url: "https://example.com/1", title: "Tab 1" });
    expect(tabs[49]).toEqual({ heliumId: "tab-50", url: "https://example.com/50", title: "Tab 50" });
  });
});
