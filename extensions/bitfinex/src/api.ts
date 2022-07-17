import BFX from "bitfinex-api-node";
import { getPreferenceValues } from "./preference";

const { api_key: apiKey, api_secret: apiSecret } = getPreferenceValues();

export default new BFX({
  apiKey,
  apiSecret,
  transform: true,
});
