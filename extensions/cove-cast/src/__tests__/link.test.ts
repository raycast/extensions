import { describe, expect, it } from "vitest";
import { COVE_TAIL, buildDeeplink, buildTgDeeplink } from "../cove";
import { buildCoveLink } from "../link";

const EVM_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

describe("buildCoveLink", () => {
  it("builds a native g_ immediate-buy link", () => {
    const url = buildCoveLink({
      kind: "g",
      ca: EVM_USDC,
      type: "evm",
      chainId: "base",
      amount: 25,
    });
    expect(url).toBe(
      buildDeeplink({
        kind: "g",
        chainId: "base",
        ca: EVM_USDC,
        type: "evm",
        amount: 25,
        botUsername: "cove_trading_bot",
      }),
    );
  });

  it("always includes the baked-in tail", () => {
    const url = buildCoveLink({
      kind: "b",
      ca: EVM_USDC,
      type: "evm",
      chainId: "base",
    });
    expect(url.endsWith(COVE_TAIL)).toBe(true);
  });

  it("builds a tg:// link when target is tg", () => {
    const url = buildCoveLink({
      kind: "b",
      ca: EVM_USDC,
      type: "evm",
      chainId: "base",
      target: "tg",
    });
    expect(url).toBe(
      buildTgDeeplink({
        kind: "b",
        chainId: "base",
        ca: EVM_USDC,
        type: "evm",
        botUsername: "cove_trading_bot",
      }),
    );
  });
});
