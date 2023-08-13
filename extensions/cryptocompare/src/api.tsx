import { LocalStorage } from "@raycast/api";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { formatNumber } from "./utils";

let cryptos = "";
export let cryptoList: string[] = [];
const fiats = "USD,EUR,AUD";
const fiatSymbol = {
  USD: "$",
  EUR: "€",
  AUD: "A$",
  CNY: "¥",
};

const instance = axios.create({
  baseURL: "https://min-api.cryptocompare.com/data/pricemulti?tsyms=" + fiats + "&fsyms=" + cryptos,
  headers: { "Content-type": "application/json" },
});

const responseBody = (response: AxiosResponse) => response.data;

const requests = {
  get: (url: string, config: AxiosRequestConfig = {}) => instance.get(url, config).then(responseBody),
};

/**
 * Retrieves the favorite cryptocurrencies from the local storage.
 *
 * @return {Promise<string[]>} An array of favorite cryptocurrencies.
 */
export async function getFavoriteCrypto() {
  const cryptoListFromLocalStorage = await LocalStorage.getItem("favoriteCrypto");
  if (!cryptoListFromLocalStorage) {
    return [];
  } else if (typeof cryptoListFromLocalStorage === "string") {
    return cryptoListFromLocalStorage.split(",");
  } else {
    return [];
  }
}

/**
 * Updates the cryptoList with the favorite cryptocurrencies.
 * If no favorite cryptocurrencies are found, it sets the default cryptoList to ["BTC", "ETH"].
 * The updated cryptoList is stored in the local storage.
 * @returns {string[]} The updated cryptoList.
 */
export async function updateCryptoList() {
  // Get the favorite cryptocurrencies from the local storage
  const favoriteCrypto = await getFavoriteCrypto();

  if (favoriteCrypto.length === 0) {
    cryptoList = ["BTC", "ETH"];
    await LocalStorage.setItem("favoriteCrypto", "BTC,ETH");
    return cryptoList;
  }

  cryptoList = [...new Set(cryptoList.concat(favoriteCrypto))];
}

/**
 * Fetches data based on the specified search criteria.
 *
 * @param {string} searchCryptos - The search criteria for cryptos.
 * @return {Promise<Array>} An array of new price data.
 */
export async function fetchData(searchCryptos: string) {
  try {
    await updateCryptoList();
    const favoriteCrypto = await getFavoriteCrypto();

    if (cryptos === "") {
      cryptos = favoriteCrypto.join(",");
    }

    if (cryptos === "") {
      cryptos = "BTC,ETH";
    }

    if (searchCryptos) {
      // 单次搜索多个交易对
      if (searchCryptos.includes(",")) {
        searchCryptos.split(",").map((item) => {
          cryptoList.push(item.toUpperCase());
          cryptos += "," + searchCryptos;
        });
      } else {
        searchCryptos = searchCryptos.toUpperCase();
        cryptoList.push(searchCryptos);
        cryptos += "," + searchCryptos;
      }
    }
    // console.log("https://min-api.cryptocompare.com/data/pricemultifull?tsyms=" + fiats + "&fsyms=" + cryptos);
    const response = await requests.get(
      "https://min-api.cryptocompare.com/data/pricemultifull?tsyms=" + fiats + "&fsyms=" + cryptos
    );

    // console.log(JSON.stringify(response));
    if (!response) {
      console.log(JSON.stringify(response));
      return [];
    }

    const newPriceData = cryptoList.map((item) => {
      let priceStr = "";
      let icon = "";
      const markets: Set<string> = new Set();
      const crypto = response.RAW[item];
      const favorite = favoriteCrypto.includes(item);
      if (crypto === undefined) {
        return { icon: "not-found.png", name: item, price: "Price not found.", markets: "", favorite: favorite };
      }

      for (const [key, value] of Object.entries(fiatSymbol)) {
        const fiatValue = crypto[key];
        if (key in crypto && fiatValue) {
          priceStr += value + formatNumber(fiatValue.PRICE) + "  ";
          markets.add(fiatValue.MARKET);
          icon = "https://cryptocompare.com" + fiatValue.IMAGEURL;
        }
      }
      const newMarkets: string[] = Array.from(markets);
      const marketsString = "From " + newMarkets.join(", ") + ".";

      return { icon: icon, name: item, price: priceStr, markets: marketsString, favorite: favorite };
    });

    return newPriceData;
  } catch (e) {
    console.log(e);
    return [];
  }
}

/**
 * Adds a favorite cryptocurrency to the list of favorite cryptocurrencies.
 *
 * @param {string} crypto - The cryptocurrency to add as a favorite.
 * @return {Promise<void>} - A promise that resolves when the favorite cryptocurrency is added.
 */
export async function addFavoriteCrypto(crypto: string) {
  crypto = crypto.toUpperCase();
  const favoriteCrypto = await getFavoriteCrypto();
  if (favoriteCrypto.length === 0) {
    await LocalStorage.setItem("favoriteCrypto", crypto);
  } else {
    favoriteCrypto.push(crypto);
    await LocalStorage.setItem("favoriteCrypto", favoriteCrypto.join(","));
  }
}

/**
 * Removes a favorite crypto from the list of favorite cryptos.
 *
 * @param {string} crypto - The crypto to be removed.
 * @return {Promise<void>} - A promise that resolves when the crypto is removed.
 */
export async function removeFavoriteCrypto(crypto: string) {
  crypto = crypto.toUpperCase();
  const favoriteCrypto = await getFavoriteCrypto();
  if (!favoriteCrypto.includes(crypto)) {
    return;
  }
  favoriteCrypto.splice(favoriteCrypto.indexOf(crypto), 1);
  await LocalStorage.setItem("favoriteCrypto", favoriteCrypto.join(","));
}
