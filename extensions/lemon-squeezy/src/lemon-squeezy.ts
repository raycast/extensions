import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { getPreferenceValues } from "@raycast/api";

export function configureLemonSqueezy() {
    const {apiKey} = getPreferenceValues<Preferences>();
    lemonSqueezySetup({apiKey, onError(error) {
          throw new Error(error.message)
    }});
}