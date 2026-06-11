import { plexBaseUrl } from "./constants";
import { plex_token } from "./constants";

export function getThumbLink({ thumb, width = 320, height = 480 }: { thumb: string; width?: number; height?: number }) {
  const thumbUrl = encodeURIComponent(thumb);
  const link = `${plexBaseUrl}/photo/:/transcode?width=${width}&height=${height}&minSize=1&upscale=1&url=${thumbUrl}&X-Plex-Token=${plex_token}`;

  return link;
}

export function getPlexDeeplink(key: string, machineIdentifier?: string) {
  return machineIdentifier
    ? `${plexBaseUrl}/web/index.html#!/server/${machineIdentifier}/details?key=${encodeURIComponent(key)}`
    : plexBaseUrl;
}

export function getImdbUrl(title: string) {
  return `https://www.imdb.com/find/?q=${encodeURIComponent(title)}`;
}

export function getTmdbUrl(title: string) {
  return `https://www.themoviedb.org/search?query=${encodeURIComponent(title)}`;
}
