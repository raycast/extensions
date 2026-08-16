import { describe, expect, it } from "vitest";
import { fillWithAIShortcut } from "./keyboardShortcuts";

describe("fillWithAIShortcut", () => {
  it("maps Fill with AI to Command+F on macOS and Control+F on Windows", () => {
    expect(fillWithAIShortcut).toEqual({
      macOS: { modifiers: ["cmd"], key: "f" },
      Windows: { modifiers: ["ctrl"], key: "f" },
    });
  });
});
