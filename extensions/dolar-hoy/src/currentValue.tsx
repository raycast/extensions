import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_URL } from "./constants";
import { Currency, ResponseType } from "./types";
import { getCurrencyName } from "./utils";

export default function Command() {
  const { isLoading, data } = useFetch<ResponseType>(`${API_URL}/latest`);

  const markdown = `
  ## Current USD value in ARS

  | Type                                      | Buy                         | Sell                         |
  | :---------------------------------------- | :-------------------------- | :--------------------------- |
  | ${getCurrencyName(Currency.usd_blue)}     | $${data?.blue.value_buy}    | $${data?.blue.value_sell}    |
  | ${getCurrencyName(Currency.usd_official)} | $${data?.oficial.value_buy} | $${data?.oficial.value_sell} |
  
  _Source: [Bluelytics](https://bluelytics.com.ar/#!/)_
  
  `;

  return <Detail markdown={markdown} isLoading={isLoading} />;
}
