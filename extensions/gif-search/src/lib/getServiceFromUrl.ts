import { IGif } from "../models/gif";
import { ServiceName } from "../preferences";

export function getServiceFromUrl(gif: IGif): ServiceName | null {
  const gifUrl = gif["url"] || gif["download_url"];

  if (gifUrl.includes("giphy.com/gifs")) return "giphy";
  if (gifUrl.includes("giphy.com/clips")) return "giphy-clips";
  if (gifUrl.includes("klipy.com") || gifUrl.includes("api.klipy.com")) return "klipy";
  if (gifUrl.includes("finergifs")) return "finergifs";

  return null;
}
