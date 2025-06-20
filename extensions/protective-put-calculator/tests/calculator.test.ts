import { calculateProtectivePut } from "../src/calculator";

// Mock the API functions for testing
jest.mock("../src/api", () => ({
  getCurrentPrice: jest.fn().mockResolvedValue({
    symbol: "TEST",
    price: 60.0,
    currency: "USD",
    marketState: "REGULAR"
  }),
  getPutPremium: jest.fn().mockResolvedValue({
    strike: 57.0,
    bid: 2.85,
    ask: 3.15,
    midPrice: 3.0,
    expiration: "20250627",
    volume: "1000",
    openInterest: "500",
    impliedVolatility: "25%",
    isEstimated: false
  })
}));

describe("Protective Put Calculator", () => {
  test("calculates position correctly for basic scenario", async () => {
    const result = await calculateProtectivePut({
      ticker: "TEST",
      stopLoss: 57.0,
      maxLoss: 500,
      holdingPeriod: "1w",
      alphaVantageApiKey: "test-api-key"
    });

    expect(result.shares).toBeGreaterThan(0);
    expect(result.contracts).toBeGreaterThan(0);
    expect(result.actualMaxLoss).toBeLessThanOrEqual(500);
    expect(result.totalCost).toBeGreaterThan(0);
  });

  test("throws error for invalid stop loss", async () => {
    await expect(calculateProtectivePut({
      ticker: "TEST",
      stopLoss: 65.0, // Above current price
      maxLoss: 500,
      holdingPeriod: "1w",
      alphaVantageApiKey: "test-api-key"
    })).rejects.toThrow("Stop loss must be below current price");
  });

  test("throws error for too small max loss", async () => {
    await expect(calculateProtectivePut({
      ticker: "TEST",
      stopLoss: 57.0,
      maxLoss: 1, // Too small
      holdingPeriod: "1w",
      alphaVantageApiKey: "test-api-key"
    })).rejects.toThrow();
  });

  test("includes option details in results", async () => {
    const result = await calculateProtectivePut({
      ticker: "TEST",
      stopLoss: 57.0,
      maxLoss: 500,
      holdingPeriod: "1w",
      alphaVantageApiKey: "test-api-key"
    });

    expect(result.optionDetails).toBeDefined();
    expect(result.optionDetails.strike).toBe(57.0);
    expect(result.optionDetails.midPrice).toBe(3.0);
    expect(result.optionDetails.expiration).toBe("20250627");
    expect(result.optionDetails.volume).toBe("1000");
    expect(result.optionDetails.openInterest).toBe("500");
    expect(result.optionDetails.impliedVolatility).toBe("25%");
    expect(result.optionDetails.isEstimated).toBe(false);
  });
});
