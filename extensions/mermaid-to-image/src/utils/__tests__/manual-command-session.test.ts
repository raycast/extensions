import { describe, expect, it, vi } from "vitest";
import { createManualCommandSession } from "../manual-command-session";
import type { ResolvedMermaidInput } from "../mermaid-input";

describe("manual-command-session", () => {
  it("guards concurrent execution until finish is called", () => {
    const session = createManualCommandSession({
      tempFileRef: { current: null },
      activeImagePathRef: { current: null },
      browserSetupInputRef: { current: null },
      cleanupTempFile: vi.fn(),
    });

    expect(session.begin()).toBe(true);
    expect(session.begin()).toBe(false);

    session.finish();

    expect(session.begin()).toBe(true);
  });

  it("stores and clears the pending browser setup input", () => {
    const browserSetupInputRef = { current: null as ResolvedMermaidInput | null };
    const session = createManualCommandSession({
      tempFileRef: { current: null },
      activeImagePathRef: { current: null },
      browserSetupInputRef,
      cleanupTempFile: vi.fn(),
    });
    const input = { code: "flowchart TD\nA --> B", source: "selected" } satisfies ResolvedMermaidInput;

    session.rememberInput(input);
    expect(session.getPendingInput()).toEqual(input);
    expect(browserSetupInputRef.current).toEqual(input);

    session.clearPendingInput();
    expect(session.getPendingInput()).toBeNull();
  });

  it("replaces the active image path and cleans the previous one on success", () => {
    const cleanupTempFile = vi.fn();
    const activeImagePathRef = { current: "/tmp/old.svg" as string | null };
    const session = createManualCommandSession({
      tempFileRef: { current: null },
      activeImagePathRef,
      browserSetupInputRef: { current: null },
      cleanupTempFile,
    });

    session.finalizeImagePath({
      kind: "success",
      mermaidCode: "flowchart TD\nA --> B",
      result: {
        outputPath: "/tmp/new.svg",
        format: "svg",
        engine: "beautiful",
      },
    });

    expect(cleanupTempFile).toHaveBeenCalledWith("/tmp/old.svg");
    expect(activeImagePathRef.current).toBe("/tmp/new.svg");
  });

  it("clears the temp file ref and disposes both active assets", () => {
    const cleanupTempFile = vi.fn();
    const tempFileRef = { current: "/tmp/diagram.mmd" as string | null };
    const activeImagePathRef = { current: "/tmp/diagram.svg" as string | null };
    const session = createManualCommandSession({
      tempFileRef,
      activeImagePathRef,
      browserSetupInputRef: { current: null },
      cleanupTempFile,
    });

    session.clearTempFile();
    expect(cleanupTempFile).toHaveBeenCalledWith("/tmp/diagram.mmd");
    expect(tempFileRef.current).toBeNull();

    session.dispose();
    expect(cleanupTempFile).toHaveBeenNthCalledWith(2, "/tmp/diagram.svg");
    expect(cleanupTempFile).toHaveBeenNthCalledWith(3, null);
  });
});
