import { describe, expect, it, vi } from "vitest";
import {
  getInputResolutionErrorMessage,
  InputResolutionError,
  resolveClipboardMermaidInput,
  resolveMermaidInput,
} from "../mermaid-input";

describe("resolveMermaidInput", () => {
  it("prefers selected text over clipboard content", async () => {
    const result = await resolveMermaidInput({
      getSelectedText: vi.fn().mockResolvedValue("```mermaid\ngraph TD\nA-->B\n```"),
      getClipboardText: vi.fn().mockResolvedValue("graph TD\nC-->D"),
    });

    expect(result).toEqual({
      code: "graph TD\nA-->B\n",
      source: "selected",
    });
  });

  it("falls back to clipboard content when selected text is unavailable", async () => {
    const result = await resolveMermaidInput({
      getSelectedText: vi.fn().mockRejectedValue(new Error("selection unavailable")),
      getClipboardText: vi.fn().mockResolvedValue("graph TD\nC-->D"),
    });

    expect(result).toEqual({
      code: "graph TD\nC-->D",
      source: "clipboard",
    });
  });

  it("throws a no-input error when selected text and clipboard are both empty", async () => {
    await expect(
      resolveMermaidInput({
        getSelectedText: vi.fn().mockResolvedValue("   "),
        getClipboardText: vi.fn().mockResolvedValue(""),
      }),
    ).rejects.toMatchObject({
      code: "NO_INPUT",
    });
  });

  it("resolves clipboard-only input without touching selection", async () => {
    const getClipboardText = vi.fn().mockResolvedValue("```mermaid\ngraph TD\nA-->B\n```");

    const result = await resolveClipboardMermaidInput({
      getClipboardText,
    });

    expect(getClipboardText).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      code: "graph TD\nA-->B\n",
      source: "clipboard",
    });
  });

  it("maps input resolution errors to safe user-facing messages", () => {
    expect(getInputResolutionErrorMessage(new InputResolutionError("NO_INPUT", "missing"))).toBe(
      "No selected text or clipboard content. Please select Mermaid code or copy it first.",
    );
    expect(getInputResolutionErrorMessage(new InputResolutionError("INPUT_READ_FAILED", "failed"))).toBe(
      "Failed to read selected text or clipboard.",
    );
  });
});
