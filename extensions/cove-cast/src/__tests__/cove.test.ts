import { describe, expect, it } from "vitest";
import {
  COVE_TAIL,
  base62ToBigInt,
  base62ToBytes,
  base58Decode,
  bigintToBase62,
  buildDeeplink,
  buildPayload,
  buildTgDeeplink,
  bytesToBase62,
  coveChainCode,
  encodeTelegramId,
  encodeToken,
  encodeUsdAmount,
  hexToBytes,
} from "../cove";

// USDC on Ethereum (EVM) and Solana, used as real round-trip fixtures.
const EVM_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const SOL_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("base62", () => {
  it("encodes all-zero bytes as a zero-padded string of the given width", () => {
    expect(bytesToBase62(new Uint8Array(20), 27)).toBe("0".repeat(27));
  });

  it("round-trips arbitrary bytes through base62 at a fixed width", () => {
    const bytes = new Uint8Array(20);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37 + 11) & 0xff;
    const encoded = bytesToBase62(bytes, 27);
    expect(encoded).toHaveLength(27);
    expect(Array.from(base62ToBytes(encoded, 20))).toEqual(Array.from(bytes));
  });

  it("round-trips integers through base62 at a fixed width", () => {
    expect(base62ToBigInt(bigintToBase62(2036764921n, 7))).toBe(2036764921n);
    expect(bigintToBase62(0n, 7)).toBe("0000000");
  });
});

describe("hexToBytes", () => {
  it("strips 0x and decodes to bytes", () => {
    expect(Array.from(hexToBytes("0x000102ff"))).toEqual([0, 1, 2, 255]);
  });
});

describe("encodeToken", () => {
  it("encodes an EVM address to 27 base62 chars and round-trips to 20 bytes", () => {
    const token = encodeToken(EVM_USDC, "evm");
    expect(token).toHaveLength(27);
    expect(Array.from(base62ToBytes(token, 20))).toEqual(
      Array.from(hexToBytes(EVM_USDC)),
    );
  });

  it("encodes a Solana address to 43 base62 chars and round-trips to 32 bytes", () => {
    const token = encodeToken(SOL_USDC, "solana");
    expect(token).toHaveLength(43);
    expect(Array.from(base62ToBytes(token, 32))).toEqual(
      Array.from(base58Decode(SOL_USDC)),
    );
  });

  it("base58Decode yields 32 bytes for a Solana mint", () => {
    expect(base58Decode(SOL_USDC)).toHaveLength(32);
  });
});

describe("encodeUsdAmount", () => {
  it.each([
    [25, "25"],
    [50, "50"],
    [100, "100"],
    [500, "500"],
    [9999, "9999"],
    [0.5, "0d5"],
    [0.05, "0d05"],
    [0.25, "0d25"],
    [1.5, "1d5"],
  ])("encodes $%d as %s", (value, expected) => {
    expect(encodeUsdAmount(value)).toBe(expected);
  });

  it.each([0, -1, 10000, 0.005, NaN, Infinity])("rejects %s", (value) => {
    expect(() => encodeUsdAmount(value)).toThrow();
  });
});

describe("coveChainCode", () => {
  it.each([
    ["ethereum", "e"],
    ["base", "b"],
    ["bsc", "n"],
    ["solana", "s"],
    ["megaeth", "m"],
    ["robinhood", "r"],
  ])("maps %s to %s", (chainId, code) => {
    expect(coveChainCode(chainId)).toBe(code);
  });

  it("returns undefined for an unsupported chain", () => {
    expect(coveChainCode("arbitrum")).toBeUndefined();
  });

  it("applies overrides", () => {
    expect(coveChainCode("hyperliquid", { hyperliquid: "h" })).toBe("h");
  });
});

describe("encodeTelegramId", () => {
  it("strips the -100 group prefix and encodes to 7 chars", () => {
    const encoded = encodeTelegramId("-1002036764921");
    expect(encoded).toHaveLength(7);
    expect(base62ToBigInt(encoded)).toBe(2036764921n);
  });

  it("encodes a plain user id", () => {
    const encoded = encodeTelegramId("123456789");
    expect(encoded).toHaveLength(7);
    expect(base62ToBigInt(encoded)).toBe(123456789n);
  });
});

describe("buildPayload", () => {
  const bot = "cove_trading_bot";

  it("builds a b_ market-panel payload for a Base EVM token", () => {
    const payload = buildPayload({
      kind: "b",
      chainId: "base",
      ca: EVM_USDC,
      type: "evm",
      botUsername: bot,
    });
    expect(payload).toBe("b_b" + encodeToken(EVM_USDC, "evm") + COVE_TAIL);
    expect(payload).toHaveLength(3 + 27 + 14);
  });

  it("builds a g_ immediate-buy payload for a $10 Solana token", () => {
    const payload = buildPayload({
      kind: "g",
      chainId: "solana",
      ca: SOL_USDC,
      type: "solana",
      amount: 10,
      botUsername: bot,
    });
    expect(payload).toBe("g_10s" + encodeToken(SOL_USDC, "solana") + COVE_TAIL);
  });

  it("always appends the cove tail (7 + 0000000 group sentinel = 14 chars)", () => {
    expect(COVE_TAIL).toHaveLength(14);
    expect(COVE_TAIL.endsWith("0000000")).toBe(true);
    const payload = buildPayload({
      kind: "g",
      chainId: "base",
      ca: EVM_USDC,
      type: "evm",
      amount: 0.5,
      botUsername: bot,
    });
    expect(payload).toBe("g_0d5b" + encodeToken(EVM_USDC, "evm") + COVE_TAIL);
  });

  it("allows the 64-char Solana worst case (g_ + 9999 + s + 43 + 14)", () => {
    const payload = buildPayload({
      kind: "g",
      chainId: "solana",
      ca: SOL_USDC,
      type: "solana",
      amount: 9999,
      botUsername: bot,
    });
    expect(payload).toHaveLength(64);
  });

  it("throws for a g_ link without an amount", () => {
    expect(() =>
      buildPayload({
        kind: "g",
        chainId: "base",
        ca: EVM_USDC,
        type: "evm",
        botUsername: bot,
      }),
    ).toThrow();
  });

  it("throws for a chain with no Cove code", () => {
    expect(() =>
      buildPayload({
        kind: "b",
        chainId: "arbitrum",
        ca: EVM_USDC,
        type: "evm",
        botUsername: bot,
      }),
    ).toThrow();
  });
});

describe("buildTgDeeplink", () => {
  it("builds a native-app tg:// link with the same payload as the https link", () => {
    const opts = {
      kind: "b",
      chainId: "base",
      ca: EVM_USDC,
      type: "evm",
      botUsername: "cove_trading_bot",
    } as const;
    expect(buildTgDeeplink(opts)).toBe(
      "tg://resolve?domain=cove_trading_bot&start=" + buildPayload(opts),
    );
  });
});

describe("buildDeeplink", () => {
  it("wraps the payload in the t.me start URL", () => {
    const url = buildDeeplink({
      kind: "b",
      chainId: "base",
      ca: EVM_USDC,
      type: "evm",
      botUsername: "cove_trading_bot",
    });
    expect(url).toBe(
      "https://t.me/cove_trading_bot?start=" +
        buildPayload({
          kind: "b",
          chainId: "base",
          ca: EVM_USDC,
          type: "evm",
          botUsername: "cove_trading_bot",
        }),
    );
  });
});
