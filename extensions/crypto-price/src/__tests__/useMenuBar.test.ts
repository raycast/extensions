import { getPreferenceValues } from "@raycast/api";
import { beforeEach, expect, jest, test } from "@jest/globals";
import { useSource } from "#/sources";
import type { Coin } from "#/types";
import { useMenuBar } from "../useMenuBar";

jest.mock(
  "@raycast/api",
  () => ({
    getPreferenceValues: jest.fn(),
  }),
  { virtual: true },
);

jest.mock("#/sources", () => ({
  useSource: jest.fn(),
}));

const getPreferenceValuesMock = jest.mocked(getPreferenceValues);
const useSourceMock = jest.mocked(useSource);

const doge: Coin = {
  name: "Dogecoin",
  symbol: "DOGE",
  price: 0.2,
  high24h: 0.25,
  low24h: 0.18,
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
  priceDisplay: "$3,500",
  more: {
    "Market Cap": "$420B",
  },
};

beforeEach(() => {
  getPreferenceValuesMock.mockReturnValue({
    source: "CryptoCompare",
    currency: "USD",
    style: "price",
    coins: "DOGE | NOTACOIN ETH",
  });
});

test("skips configured symbols missing from a partial source response", () => {
  useSourceMock.mockReturnValue({
    isLoading: false,
    coins: {
      DOGE: doge,
      ETH: eth,
    },
  });

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
  });
});
