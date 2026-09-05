import { describe, expect, it } from "vitest";

import { TranslationService } from "./service";
import type { TranslationProvider } from "./types";

describe("TranslationService", () => {
  it("rejects blank input before calling a provider", async () => {
    let calls = 0;
    const provider: TranslationProvider = {
      translate: async () => {
        calls += 1;
        throw new Error("must not be called");
      },
    };

    await expect(
      new TranslationService(provider).translate(" \n "),
    ).rejects.toThrow("Enter text to translate");
    expect(calls).toBe(0);
  });
});
