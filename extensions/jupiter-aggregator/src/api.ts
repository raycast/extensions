import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import axios from "axios";

interface Preferences {
  TOKEN_LIST: string;
}

const preferences = getPreferenceValues<Preferences>();
const list = preferences.TOKEN_LIST;

export interface PriceResponse<T extends string> {
  data: Record<T, SolItem>;
  timeTaken: number;
  contextSlot: number;
}

interface SolItem {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: string;
}

export interface TokenListResponse {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  extensions: object;
  tags: string;
}

export function fetchPrice<T extends string>(token: T) {
  return useFetch<PriceResponse<T>>(`https://price.jup.ag/v4/price?ids=${token}`, {
    onError: (error: Error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Price Fetch Failed",
        message: "Check network connection:" + error,
      });
    },
  });
}

export function fetchTokenList() {
  return useFetch<TokenListResponse>(`https://token.jup.ag/${list}`, {
    onError: (error: Error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch token list",
        message: "Check network connection:" + error,
      });
    },
  });
}

export const compareTokens = async (token1: string, amount: any, token2: string) => {
  try {
    const res = await axios.get(`https://price.jup.ag/v4/price?ids=${token1}&vsToken=${token2}`);
    const result = amount * res.data.data[token1].price;
    return result;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to compare tokens",
      message: "Check network connection:" + error,
    });
  }
};
