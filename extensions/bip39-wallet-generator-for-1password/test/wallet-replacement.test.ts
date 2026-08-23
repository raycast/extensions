import { describe, expect, it, vi } from "vitest";

import {
  applyWalletReplacement,
  createInitialWalletState,
  needsPreferenceReplacement,
  prepareWalletReplacement,
  WALLET_REPLACEMENT_WARNING,
  type WalletViewState,
} from "../src/wallet-replacement";

interface TestWallet {
  id: string;
}

describe("wallet replacement", () => {
  it("uses the required irreversible-discard warning", () => {
    expect(WALLET_REPLACEMENT_WARNING).toBe(
      "The current recovery phrase will be discarded and cannot be recovered.",
    );
  });

  it("creates the initial wallet immediately and keeps it masked", () => {
    const generate = vi.fn(() => ({ id: "initial-24" }));

    expect(createInitialWalletState(24, generate)).toEqual({
      result: { id: "initial-24" },
      generatedWordCount: 24,
      revealed: false,
    });
    expect(generate).toHaveBeenCalledOnce();
    expect(generate).toHaveBeenCalledWith(24);
  });

  it("compares the preference with the wallet actually being displayed", () => {
    expect(needsPreferenceReplacement(12, 12)).toBe(false);
    expect(needsPreferenceReplacement(12, 24)).toBe(true);
    expect(needsPreferenceReplacement(24, 12)).toBe(true);
    expect(needsPreferenceReplacement(24, 24)).toBe(false);

    // A canceled 12 → 24 change leaves a 12-word wallet displayed. Changing
    // the preference back to 12 therefore needs no replacement prompt.
    expect(needsPreferenceReplacement(12, 12)).toBe(false);
  });

  it("keeps the exact current state when confirmation is canceled", async () => {
    const current: WalletViewState<TestWallet> = {
      result: { id: "current" },
      generatedWordCount: 12,
      revealed: true,
    };
    const generate = vi.fn(() => ({ id: "replacement" }));

    const outcome = await prepareWalletReplacement(24, {
      confirm: vi.fn().mockResolvedValue(false),
      generate,
      isCurrent: () => true,
    });

    expect(outcome).toEqual({ status: "cancelled" });
    expect(generate).not.toHaveBeenCalled();
    expect(applyWalletReplacement(current, outcome)).toBe(current);
  });

  it("generates only after confirmation and hides the replacement", async () => {
    const current: WalletViewState<TestWallet> = {
      result: { id: "current" },
      generatedWordCount: 12,
      revealed: true,
    };
    const events: string[] = [];
    const generate = vi.fn((wordCount: 12 | 24) => {
      events.push(`generate:${wordCount}`);
      return { id: `replacement-${wordCount}` };
    });

    const outcome = await prepareWalletReplacement(24, {
      confirm: async () => {
        events.push("confirm");
        return true;
      },
      generate,
      isCurrent: () => {
        events.push("current");
        return true;
      },
    });

    expect(events).toEqual(["confirm", "current", "generate:24"]);
    expect(generate).toHaveBeenCalledOnce();
    expect(applyWalletReplacement(current, outcome)).toEqual({
      result: { id: "replacement-24" },
      generatedWordCount: 24,
      revealed: false,
    });
  });

  it("ignores a confirmation result after the preference target changes", async () => {
    let resolveConfirmation: (confirmed: boolean) => void = () => {};
    const confirmation = new Promise<boolean>((resolve) => {
      resolveConfirmation = resolve;
    });
    let preferredWordCount: 12 | 24 = 24;
    const generate = vi.fn(() => ({ id: "stale-replacement" }));
    const current: WalletViewState<TestWallet> = {
      result: { id: "current" },
      generatedWordCount: 12,
      revealed: true,
    };

    const pending = prepareWalletReplacement(24, {
      confirm: () => confirmation,
      generate,
      isCurrent: () => preferredWordCount === 24,
    });

    preferredWordCount = 12;
    resolveConfirmation(true);
    const outcome = await pending;

    expect(outcome).toEqual({ status: "stale" });
    expect(generate).not.toHaveBeenCalled();
    expect(applyWalletReplacement(current, outcome)).toBe(current);
  });
});
