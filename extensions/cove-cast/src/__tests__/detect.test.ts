import { describe, expect, it } from "vitest";
import { extractContractAddress, parseDexscreenerTokens } from "../detect";

const EVM = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("extractContractAddress", () => {
  it("pulls an EVM address out of noisy text", () => {
    expect(extractContractAddress(`CA: ${EVM} 🚀 buy now`)).toEqual({
      ca: EVM,
      type: "evm",
    });
  });

  it("pulls a Solana address out of noisy text", () => {
    expect(extractContractAddress(`new gem ${SOL} ape in`)).toEqual({
      ca: SOL,
      type: "solana",
    });
  });

  it("prefers EVM when both an EVM and a Solana address are present", () => {
    expect(extractContractAddress(`${SOL} and also ${EVM}`)).toEqual({
      ca: EVM,
      type: "evm",
    });
  });

  it("returns null when no address is present", () => {
    expect(
      extractContractAddress("just some chatter, no address here"),
    ).toBeNull();
    expect(extractContractAddress("")).toBeNull();
  });

  it("ignores a 64-hex transaction hash (it is not a 40-hex address)", () => {
    const txHash = "0x" + "a".repeat(64);
    expect(extractContractAddress(`tx confirmed: ${txHash} 🎉`)).toBeNull();
    expect(extractContractAddress(txHash)).toBeNull();
  });

  it("still extracts a real EVM address sitting next to other hex", () => {
    expect(extractContractAddress(`gas 0xdeadbeef → ${EVM}`)).toEqual({
      ca: EVM,
      type: "evm",
    });
  });
});

describe("parseDexscreenerTokens", () => {
  it("sums liquidity per chain and sorts chains by liquidity desc", () => {
    const json = {
      pairs: [
        {
          chainId: "ethereum",
          baseToken: { address: EVM, symbol: "USDC", name: "USD Coin" },
          liquidity: { usd: 1000 },
        },
        {
          chainId: "base",
          baseToken: { address: EVM, symbol: "USDC", name: "USD Coin" },
          liquidity: { usd: 4000 },
        },
        {
          chainId: "base",
          baseToken: { address: EVM, symbol: "USDC", name: "USD Coin" },
          liquidity: { usd: 1000 },
        },
      ],
    };
    const result = parseDexscreenerTokens(json, EVM);
    expect(result.symbol).toBe("USDC");
    expect(result.name).toBe("USD Coin");
    expect(result.chains).toEqual([
      { chainId: "base", liquidityUsd: 5000 },
      { chainId: "ethereum", liquidityUsd: 1000 },
    ]);
  });

  it("treats missing liquidity as zero", () => {
    const json = {
      pairs: [{ chainId: "bsc", baseToken: { address: EVM, symbol: "X" } }],
    };
    expect(parseDexscreenerTokens(json, EVM).chains).toEqual([
      { chainId: "bsc", liquidityUsd: 0 },
    ]);
  });

  it("reads the symbol from the quoteToken when the queried token is the quote side", () => {
    const json = {
      pairs: [
        {
          chainId: "solana",
          baseToken: {
            address: "OtherMint1111111111111111111111111111111111",
            symbol: "WIF",
          },
          quoteToken: { address: SOL, symbol: "USDC", name: "USD Coin" },
          liquidity: { usd: 300 },
        },
      ],
    };
    const result = parseDexscreenerTokens(json, SOL);
    expect(result.symbol).toBe("USDC");
    expect(result.chains).toEqual([{ chainId: "solana", liquidityUsd: 300 }]);
  });

  it("returns no chains for empty/missing pairs", () => {
    expect(parseDexscreenerTokens({ pairs: [] }, EVM).chains).toEqual([]);
    expect(parseDexscreenerTokens({}, EVM).chains).toEqual([]);
  });
});
