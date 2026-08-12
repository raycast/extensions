import { describe, expect, it } from "vitest";
import {
  canSafelyRestoreClipboard,
  getRestorableClipboardContent,
  restoreClipboardWithRetry,
} from "../src/clipboard-safety";

describe("Clipboard restoration safety", () => {
  it("returns the exact payload Raycast can restore", () => {
    expect(getRestorableClipboardContent({ text: "reference" })).toBe("reference");
    expect(getRestorableClipboardContent({ text: "" })).toBe("");
    expect(getRestorableClipboardContent({ text: "reference", html: "<p>reference</p>" })).toEqual({
      html: "<p>reference</p>",
      text: "reference",
    });
  });

  it("accepts representations Raycast can restore losslessly", () => {
    expect(canSafelyRestoreClipboard({ text: "reference" })).toBe(true);
    expect(canSafelyRestoreClipboard({ text: "" })).toBe(true);
    expect(canSafelyRestoreClipboard({ text: "reference", html: "<p>reference</p>" })).toBe(true);
  });

  it("rejects file-bearing representations", () => {
    expect(getRestorableClipboardContent({ text: "reference", file: "/tmp/reference.png" })).toBeNull();
    expect(canSafelyRestoreClipboard({ text: "reference", file: "/tmp/reference.png" })).toBe(false);
    expect(
      canSafelyRestoreClipboard({ text: "reference", file: "/tmp/reference.png", html: "<p>reference</p>" }),
    ).toBe(false);
  });

  it("retries transient restoration failures", async () => {
    const attempts: string[] = [];
    const pauses: number[] = [];

    await restoreClipboardWithRetry(
      "reference",
      async (content) => {
        attempts.push(String(content));
        if (attempts.length < 3) throw new Error("pasteboard busy");
      },
      3,
      async (delayMs) => {
        pauses.push(delayMs);
      },
    );

    expect(attempts).toEqual(["reference", "reference", "reference"]);
    expect(pauses).toEqual([50, 100]);
  });

  it("surfaces a persistent restoration failure", async () => {
    const failure = new Error("pasteboard unavailable");
    let attempts = 0;

    await expect(
      restoreClipboardWithRetry(
        "reference",
        async () => {
          attempts += 1;
          throw failure;
        },
        3,
        async () => undefined,
      ),
    ).rejects.toBe(failure);
    expect(attempts).toBe(3);
  });
});
