import BFX from "bitfinex-api-node";
import { getPreferenceValues } from "@raycast/api";

type Preference = {
  api_key: string;
  api_secret: string;
};

const { api_key: apiKey, api_secret: apiSecret } = getPreferenceValues<Preference>();

export default new BFX({
  apiKey,
  apiSecret,
  transform: true,
});
