import { showToast, Toast } from "@raycast/api";
import BFX from "bitfinex-api-node";
import { getPreferenceValues } from "./preference";

const { api_key: apiKey, api_secret: apiSecret } = getPreferenceValues();

export const Bitfinex = new BFX({
  apiKey,
  apiSecret,
  transform: true,
});

export const rest = Bitfinex.rest();

export default Bitfinex;

export function handleAPIError(title: string, e: any) {
  const [type, errorCode, message] = e.error;

  showToast({
    style: Toast.Style.Failure,
    title,
    message: `${type} (${errorCode}): ${message}`,
  });
}

export function calcAvailableBalance(currency: string): Promise<any> {
  return rest.calcAvailableBalance(currency, 0, 0, "FUNDING");
}

export function getFundingOffers(currency: string) {
  return rest.fundingOffers(currency) as Promise<any[]>;
}
