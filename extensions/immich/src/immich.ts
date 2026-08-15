import { getAssetThumbnailPath, getAssetOriginalPath, init } from "@immich/sdk";
import { getPreferenceValues } from "@raycast/api";

const { base_url, api_key } = getPreferenceValues<Preferences>();
const buildUrl = (route = "") => new URL(route, base_url).toString();
const buildAuthenticatedUrl = (route: string) => `${buildUrl("api" + route)}?apiKey=${api_key}`;
export const initialize = () => init({ baseUrl: buildUrl("api"), apiKey: api_key });

export const getAssetWebUrl = (id: string) => buildUrl(`photos/${encodeURIComponent(id)}`);
export const getAssetThumbnail = (id: string) => buildAuthenticatedUrl(getAssetThumbnailPath(id));
export const getAssetOriginal = (id: string) => buildAuthenticatedUrl(getAssetOriginalPath(id));
