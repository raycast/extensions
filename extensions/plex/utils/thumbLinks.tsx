import { plexBaseUrl } from "./constants";
import { plex_token } from "./constants";

export default function thumbLinks({ thumb }: { thumb: string }) {
  const link = `${plexBaseUrl}${thumb}?X-Plex-Token=${plex_token}`;
  return link;
}
