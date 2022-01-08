import axios from "axios";
import $ from "cheerio";
import fetch from "node-fetch";

import { ResultData, PriceData } from "../types";

type FetchParameters = {
  limit: number;
  start: number;
};

export const fetchAllCrypto = ({ limit, start }: FetchParameters) =>
  axios.get<ResultData>("https://api.coinmarketcap.com/data-api/v3/map/all", {
    data: {
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

      const priceValue = $html(".priceValue");

      // get price diff element className
      const priceDirectionClassName = $html(".priceValue + span > span[class^=icon-Caret]").attr("class");
      const isUp = !!(priceDirectionClassName && priceDirectionClassName.split("-").includes("up"));
      const priceDiff = priceValue.next("span").text();

      const currencyPrice = priceValue.text();

      if (!currencyPrice) {
        return null;
      }

      return { currencyPrice, priceDiff, isUp };
    });
}
