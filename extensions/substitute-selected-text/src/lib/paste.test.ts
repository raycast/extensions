import { describe, expect, it, vi } from "vitest";

import { pasteTextToFrontmostApp } from "./paste";

describe("pasteTextToFrontmostApp", () => {
  it("throws when paste executor is missing", async () => {
    await expect(
      pasteTextToFrontmostApp("hello world", undefined as unknown as never),
    ).rejects.toThrow(/missing paste executor/i);
  });

  it("delegates paste to provided executor", async () => {
    const executor = vi.fn(async () => undefined);

    await pasteTextToFrontmostApp("hello world", executor);

    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledWith("hello world");
  });

  it("wraps underlying paste errors with actionable message", async () => {
    const executor = vi.fn(async () => {
      throw new Error("permission denied");
    });

    await expect(
      pasteTextToFrontmostApp("hello world", executor),
    ).rejects.toThrow(
      /failed to paste back into source app: permission denied/i,
    );
  });

  it("closes Raycast window before pasting when close executor is provided", async () => {
    const callOrder: string[] = [];

    const closeExecutor = vi.fn(async () => {
      callOrder.push("close");
    });

    const pasteExecutor = vi.fn(async () => {
      callOrder.push("paste");
    });

    await pasteTextToFrontmostApp(
      "hello world",
      pasteExecutor,
      closeExecutor,
      0,
    );

    expect(closeExecutor).toHaveBeenCalledTimes(1);
    expect(pasteExecutor).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["close", "paste"]);
  });
});
