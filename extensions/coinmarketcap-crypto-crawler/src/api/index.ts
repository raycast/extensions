import axios from "axios";
import * as $ from "cheerio";
import fetch from "node-fetch";
import { PriceDirection } from "../types";
import { ResultData, PriceData } from "../types";

type FetchParameters = {
  limit: number;
  start: number;
};

export const fetchAllCrypto = ({ limit, start }: FetchParameters) =>
  axios.get<ResultData>("https://api.coinmarketcap.com/data-api/v3/map/all", {
    params: {
      cryptoAux: "is_active,status",
      exchangeAux: "is_active,status",
      limit,
      start,
    },
  });

export const BASE_URL = "https://coinmarketcap.com/currencies/";

export async function fetchPrice(slug: string): Promise<PriceData | null> {
  return fetch(`${BASE_URL}${slug}/`)
    .then((r) => r.text())
    .then((html) => {
      const $html = $.load(html);

      const priceSelector = '[data-test="text-cdp-price-display"]';
      const priceValueElement = $html(priceSelector);

      const targetCoinDataChange = priceValueElement.next().find(".change-text");
      const priceDiff = targetCoinDataChange.text();
      const direction = targetCoinDataChange.attr("data-change") as PriceDirection;

      const currencyPrice = $html(priceValueElement).text();

      if (!currencyPrice) {
        return null;
      }

      return { currencyPrice, priceDiff, direction };
    });
}
