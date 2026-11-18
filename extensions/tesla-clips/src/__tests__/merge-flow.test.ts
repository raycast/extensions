import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmAlert } from "@raycast/api";
import { confirmDeleteSourceSegments } from "../lib/merge-flow";

describe("merge-flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips delete confirmation when preference is disabled", async () => {
    const confirmed = await confirmDeleteSourceSegments({
      ffmpegPath: "ffmpeg",
      overwriteExisting: false,
      deleteSourceSegmentsAfterMerge: false,
    });

    expect(confirmed).toBe(true);
    expect(confirmAlert).not.toHaveBeenCalled();
  });

  it("prompts before deleting source segments", async () => {
    const confirmed = await confirmDeleteSourceSegments({
      ffmpegPath: "ffmpeg",
      overwriteExisting: false,
      deleteSourceSegmentsAfterMerge: true,
    });

    expect(confirmed).toBe(true);
    expect(confirmAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Delete Source Clips After Merge?",
      }),
    );
  });
});
