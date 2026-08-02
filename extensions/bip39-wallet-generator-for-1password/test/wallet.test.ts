import { describe, expect, it } from "vitest";

import { buildWalletResult, generateMnemonic } from "../src/wallet";

const FIXED_MNEMONIC =
  "test test test test test test test test test test test junk";

describe("wallet derivation", () => {
  it("generates valid word counts", () => {
    expect(generateMnemonic(12).split(" ")).toHaveLength(12);
    expect(generateMnemonic(24).split(" ")).toHaveLength(24);
  });

  it("matches fixed cross-chain addresses", () => {
    const result = buildWalletResult(FIXED_MNEMONIC);
    expect(result.chains.evm.address).toBe(
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    );
    expect(result.chains.btc.address).toBe(
      "bc1q4qw42stdzjqs59xvlrlxr8526e3nunw7mp73te",
    );
    expect(result.chains.sol.address).toBe(
      "oeYf6KAJkLYhBuR8CiGc6L4D4Xtfepr85fuDgA9kq96",
    );
  });
});
