import { getPreferenceValues } from "@raycast/api";

import AdsSearch from "./Ads/List";

export default function Command() {
  const { path } = getPreferenceValues<Preferences>();
  const { api_token } = getPreferenceValues<Preferences.LlyfrAds>();

  return <AdsSearch ads_api_token={api_token} path={path} />;
}
