import { describe, expect, it } from "vitest";
import { resolveChains } from "../resolve";
import type { ExtractedAddress, TokenInfo } from "../detect";

const EVM: ExtractedAddress = {
  ca: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  type: "evm",
};
const SOL: ExtractedAddress = {
  ca: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  type: "solana",
};

const info = (chains: TokenInfo["chains"], symbol = "USDC"): TokenInfo => ({
  symbol,
  chains,
});

describe("resolveChains", () => {
  it("resolves a Solana address straight to solana", () => {
    expect(
      resolveChains(SOL, info([{ chainId: "solana", liquidityUsd: 500 }])),
    ).toEqual({ kind: "ready", chainId: "solana" });
  });

  it("auto-resolves when exactly one Cove-supported chain is detected", () => {
    const result = resolveChains(
      EVM,
      info([
        { chainId: "arbitrum", liquidityUsd: 9999 }, // no Cove code -> ignored
        { chainId: "base", liquidityUsd: 4000 },
      ]),
    );
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") expect(result.chainId).toBe("base");
  });

  it("auto-resolves to the highest-liquidity chain when several are detected", () => {
    const result = resolveChains(
      EVM,
      info([
        { chainId: "ethereum", liquidityUsd: 1000 },
        { chainId: "base", liquidityUsd: 4000 },
      ]),
    );
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") expect(result.chainId).toBe("base");
  });

  it("treats every Cove chain as supported (e.g. a megaeth-only token)", () => {
    const result = resolveChains(
      EVM,
      info([{ chainId: "megaeth", liquidityUsd: 100 }]),
    );
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") expect(result.chainId).toBe("megaeth");
  });

  it("returns none when no Cove-supported chain is detected", () => {
    expect(
      resolveChains(EVM, info([{ chainId: "arbitrum", liquidityUsd: 5 }])).kind,
    ).toBe("none");
    expect(resolveChains(EVM, info([])).kind).toBe("none");
  });

  it("returns none when detection failed entirely (null token info)", () => {
    expect(resolveChains(EVM, null).kind).toBe("none");
  });
});
