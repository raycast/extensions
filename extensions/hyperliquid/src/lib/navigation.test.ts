import { describe, expect, it } from "vitest";

import { getHyperliquidTradeUrl } from "./navigation";

describe("navigation helpers", () => {
  it("builds Hyperliquid trade URLs for perp coins", () => {
    expect(getHyperliquidTradeUrl("btc")).toBe("https://app.hyperliquid.xyz/trade/BTC");
    expect(getHyperliquidTradeUrl("kPEPE")).toBe("https://app.hyperliquid.xyz/trade/KPEPE");
  });

  it("keeps HIP-3 namespaced symbols verbatim", () => {
    expect(getHyperliquidTradeUrl("xyz:TSLA")).toBe("https://app.hyperliquid.xyz/trade/xyz:TSLA");
    expect(getHyperliquidTradeUrl(" xyz:TSLA ")).toBe("https://app.hyperliquid.xyz/trade/xyz:TSLA");
  });
});
