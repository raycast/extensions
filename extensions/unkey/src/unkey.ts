import { getPreferenceValues } from "@raycast/api";
import { Unkey } from "@unkey/api";

const { access_token } = getPreferenceValues<Preferences>();
export const unkey = new Unkey({
  rootKey: access_token,
});
