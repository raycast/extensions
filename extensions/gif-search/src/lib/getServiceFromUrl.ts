import { IGif } from "../models/gif";
import { ServiceName } from "../preferences";

export function getServiceFromUrl(gif: IGif): ServiceName | null {
  const gifUrl = gif["url"] || gif["download_url"];

  if (gifUrl.includes("giphy.com/gifs")) return "giphy";
  if (gifUrl.includes("giphy.com/clips")) return "giphy-clips";
  if (gifUrl.includes("tenor.com") || gifUrl.includes("c.tenor.com") || gifUrl.includes("media.tenor.com"))
    return "tenor";
  if (gifUrl.includes("finergifs")) return "finergifs";

  return null;
}
