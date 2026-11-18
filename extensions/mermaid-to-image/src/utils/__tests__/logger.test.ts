import { afterEach, describe, expect, it, vi } from "vitest";
import { logOperationalError, logOperationalEvent } from "../logger";

describe("logOperationalEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not log Ondine source-bearing errors or snippets", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logOperationalError("failed", new Error("secret source"), {
      renderer: "ondine",
      message: "secret source",
      reason: "secret source",
      snippet: "secret source",
    });
    expect(consoleError.mock.calls[0][1]).toEqual({ renderer: "ondine", failureClass: "ondine-render-failed" });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret source");
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
