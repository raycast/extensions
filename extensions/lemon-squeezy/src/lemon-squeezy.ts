import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { getPreferenceValues } from "@raycast/api";

export function configureLemonSqueezy() {
  const { api_key } = getPreferenceValues<Preferences>();
  lemonSqueezySetup({
    apiKey: api_key,
    onError(error) {
      throw new Error(error.message);
    },
  });
}
