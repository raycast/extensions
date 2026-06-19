import { afterEach, describe, expect, it, vi } from "vitest";
import { logOperationalEvent } from "../logger";

describe("logOperationalEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("drops Mermaid payload fields from logged metadata", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);

    logOperationalEvent("diagram-generation", {
      source: "clipboard",
      renderer: "beautiful",
      mermaidCode: "graph TD\nA-->B",
      clipboardText: "graph TD\nA-->B",
      svgContent: "<svg>secret</svg>",
      message: "started",
    });

    expect(consoleInfo).toHaveBeenCalledTimes(1);
    expect(consoleInfo.mock.calls[0][1]).toEqual({
      source: "clipboard",
      renderer: "beautiful",
      message: "started",
    });
  });
});
