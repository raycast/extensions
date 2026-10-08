import { Coin, CoinId } from "../types/coin";
import { useEffect, useState, useRef } from "react";
import { getCoins } from "../api";
import { DEFAULT_CURRENCY_CRYPTO, WEBSERVICE_URL } from "../enum";
import { List, showToast, Toast } from "@raycast/api";
import { FormatDate, FormatPrice } from "./index";
import axios from "axios";

export function FetchCoinDetails(props: CoinId) {
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isMounted = useRef(true);
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function fetchCoinDetails() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      try {
        const coin: Coin = await getCoins.getCoinDetails(props.coinId, cancelRef.current.signal);
        const markdown = `
  ## ${coin.name} | ${coin.symbol.toUpperCase()}
 
  **Price**
  
  ${FormatPrice(coin.quotes.USD.price)} | ${FormatPrice(
          coin.quotes[DEFAULT_CURRENCY_CRYPTO].price,
          DEFAULT_CURRENCY_CRYPTO
        )}
  
  
  **Marketcap**
  
  ${FormatPrice(coin.quotes.USD.market_cap)} | ${FormatPrice(
          coin.quotes[DEFAULT_CURRENCY_CRYPTO].market_cap,
          DEFAULT_CURRENCY_CRYPTO
        )} 

  ---
  **Trend USD | BTC**       
  * 1 Day:      ${coin.quotes.USD.percent_change_24h}% | ${coin.quotes[DEFAULT_CURRENCY_CRYPTO].percent_change_24h}%
  * 7 Days:     ${coin.quotes.USD.percent_change_7d}% | ${coin.quotes[DEFAULT_CURRENCY_CRYPTO].percent_change_7d}% 
  * 30 Days:    ${coin.quotes.USD.percent_change_30d}% | ${coin.quotes[DEFAULT_CURRENCY_CRYPTO].percent_change_30d}%
  * YTD:        ${coin.quotes.USD.percent_change_1y}% | ${coin.quotes[DEFAULT_CURRENCY_CRYPTO].percent_change_1y}% 
  
  **All Time High USD | BTC**
  * %:      ${coin.quotes.USD.percent_from_price_ath}% | ${coin.quotes[DEFAULT_CURRENCY_CRYPTO].percent_from_price_ath}%
  * Price:  ${FormatPrice(coin.quotes.USD.ath_price)} | ${FormatPrice(
          coin.quotes[DEFAULT_CURRENCY_CRYPTO].ath_price,
          DEFAULT_CURRENCY_CRYPTO
        )}
  * Date:   ${FormatDate(coin.quotes.USD.ath_date)} | ${FormatDate(coin.quotes[DEFAULT_CURRENCY_CRYPTO].ath_date)}
  
  
  ---
  **Visit Coin**
  [Coingecko -> ${coin.symbol}](${WEBSERVICE_URL + coin.id} )

      `;
        if (isMounted.current) {
          setMarkdown(markdown);
        }
      } catch (e) {
        if (axios.isCancel(e)) return;
        console.log(e);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch the coin details",
        });
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    }
    fetchCoinDetails();

    return () => {
      isMounted.current = false;
      cancelRef.current?.abort();
    };
  }, []);

  return <List.Item.Detail isLoading={isLoading} markdown={markdown} />;
}
