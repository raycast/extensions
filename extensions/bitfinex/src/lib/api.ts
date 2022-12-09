import { showToast, Toast } from "@raycast/api";
import BFX from "bitfinex-api-node";
import { getPreferenceValues } from "./preference";

const { api_key: apiKey, api_secret: apiSecret } = getPreferenceValues();

export default new BFX({
  apiKey,
  apiSecret,
  transform: true,
});

export function handleAPIError(title: string, e: any) {
  const [type, errorCode, message] = e.error;

  showToast({
    style: Toast.Style.Failure,
    title,
    message: `${type} (${errorCode}): ${message}`,
  });
}
