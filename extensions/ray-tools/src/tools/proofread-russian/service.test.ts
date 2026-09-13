import { describe, expect, it } from "vitest";

import { RussianProofreadingService } from "./service";
import type { ProofreadingProvider } from "./types";

describe("RussianProofreadingService", () => {
  it("rejects blank input before calling a provider", async () => {
    let calls = 0;
    const provider: ProofreadingProvider = {
      check: async () => {
        calls += 1;
        throw new Error("must not be called");
      },
    };

    await expect(
      new RussianProofreadingService(provider).check(" \n "),
    ).rejects.toThrow("Enter Russian text to check");
    expect(calls).toBe(0);
  });

  it("trims the text before sending it to the provider", async () => {
    let receivedText = "";
    const provider: ProofreadingProvider = {
      check: async (text) => {
        receivedText = text;
        return {
          text,
          correctedText: text,
          issues: [],
          language: "ru-RU",
          provider: "test",
        };
      },
    };

    const result = await new RussianProofreadingService(provider).check(
      "  Привет, мир.  ",
    );

    expect(receivedText).toBe("Привет, мир.");
    expect(result.text).toBe("Привет, мир.");
  });
});
