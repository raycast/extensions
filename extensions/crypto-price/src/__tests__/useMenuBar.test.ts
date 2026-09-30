import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { beforeEach, expect, jest, test } from "@jest/globals";
import type { Coin } from "#/types";
import { useMenuBar } from "../useMenuBar";

jest.mock(
  "@raycast/api",
  () => ({
    getPreferenceValues: jest.fn(),
  }),
  { virtual: true },
);

// Mock the data hook so `fetchPrices` never runs; we only test the title/items/sections mapping.
jest.mock(
  "@raycast/utils",
  () => ({
    useCachedPromise: jest.fn(),
  }),
  { virtual: true },
);

const getPreferenceValuesMock = jest.mocked(getPreferenceValues);
const useCachedPromiseMock = jest.mocked(useCachedPromise);

const doge: Coin = {
  name: "Dogecoin",
  symbol: "DOGE",
  price: 0.2,
  high24h: 0.25,
  low24h: 0.18,
  quoteCurrency: "USD",
  priceDisplay: "$0.20",
  more: {
    "Market Cap": "$29B",
  },
};

const eth: Coin = {
  name: "Ethereum",
  symbol: "ETH",
  price: 3500,
  high24h: 3600,
  low24h: 3400,
  quoteCurrency: "USD",
  priceDisplay: "$3,500",
  more: {
    "Market Cap": "$420B",
  },
};

beforeEach(() => {
  getPreferenceValuesMock.mockReturnValue({
    source: "Binance",
    currency: "USD",
    style: "price",
    coins: "DOGE | NOTACOIN ETH",
  });
});

test("skips configured symbols missing from a partial source response", () => {
  useCachedPromiseMock.mockReturnValue({
    isLoading: false,
    data: {
      coins: {
        DOGE: doge,
        ETH: eth,
      },
      source: "Binance",
    },
    // Fields we don't use in useMenuBar; cast keeps the mock shape minimal.
  } as unknown as ReturnType<typeof useCachedPromise>);

  expect(useMenuBar()).toEqual({
    isLoading: false,
    title: "$0.20",
    items: ["ETH: $3,500"],
    sections: [
      {
        title: "Dogecoin",
        items: ["Market Cap: $29B"],
      },
    ],
    activeSource: "Binance",
  });
});
