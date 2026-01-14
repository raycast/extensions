import { getAssetThumbnailPath, init } from "@immich/sdk";
import { getPreferenceValues } from "@raycast/api";

const { base_url, api_key } = getPreferenceValues<Preferences>();
const buildUrl = (route = "") => new URL(route, base_url).toString();
const buildAuthenticatedUrl = (route: string) => `${buildUrl("api" + route)}?apiKey=${api_key}`;
export const initialize = () => init({ baseUrl: buildUrl("api"), apiKey: api_key });

export const getAssetThumbnail = (id: string) => buildAuthenticatedUrl(getAssetThumbnailPath(id));
