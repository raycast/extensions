import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { discardReview, loadReview, saveReview } from "../lib/review-store";
import type { ReviewRecord } from "../types";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

function record(requestId: string): ReviewRecord {
  return {
    version: 1,
    requestId,
    createdAt: Date.now(),
    imagePath: "/tmp/nonexistent-capture.png",
    outputMode: "raw",
    commandName: "capture-math",
    result: {
      latex: "x",
      tokenCount: 1,
      meanTokenProbability: 1,
      minimumTokenProbability: 1,
      eosReached: true,
      syntaxValid: true,
      elapsedMs: 1,
      backend: "cpu",
      reviewReasons: [],
    },
  };
}

describe("review store", () => {
  it("keeps concurrent review records isolated", async () => {
    const supportPath = await mkdtemp(path.join(os.tmpdir(), "local-latex-review-"));
    temporaryDirectories.push(supportPath);
    const first = record("first");
    const second = record("second");

    await Promise.all([saveReview(supportPath, first), saveReview(supportPath, second)]);

    expect((await loadReview(supportPath, first.requestId))?.requestId).toBe("first");
    expect((await loadReview(supportPath, second.requestId))?.requestId).toBe("second");
    await discardReview(supportPath, first);
    expect((await loadReview(supportPath, second.requestId))?.requestId).toBe("second");
  });
});
