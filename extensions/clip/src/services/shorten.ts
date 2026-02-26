import { ShortenResult } from "../types";
import { ensureProtocol } from "../utils/url";
import { shortenWithBitly } from "./bitly";
import { shortenWithCuttly } from "./cuttly";
import { shortenWithIsgd } from "./isgd";
import { shortenWithTinyurl } from "./tinyurl";
import { shortenWithVgd } from "./vgd";

export async function shortenUrl(
  serviceId: string,
  url: string,
  apiKey?: string,
): Promise<ShortenResult> {
  const normalizedUrl = ensureProtocol(url);
  let shortUrl: string;

  switch (serviceId) {
    case "bitly":
      if (!apiKey) throw new Error("bit.ly requires an API key");
      shortUrl = await shortenWithBitly(normalizedUrl, apiKey);
      break;
    case "cuttly":
      if (!apiKey) throw new Error("cutt.ly requires an API key");
      shortUrl = await shortenWithCuttly(normalizedUrl, apiKey);
      break;
    case "tinyurl":
      shortUrl = await shortenWithTinyurl(normalizedUrl);
      break;
    case "isgd":
      shortUrl = await shortenWithIsgd(normalizedUrl);
      break;
    case "vgd":
      shortUrl = await shortenWithVgd(normalizedUrl);
      break;
    default:
      throw new Error(`Unknown service: ${serviceId}`);
  }

  return {
    originalUrl: normalizedUrl,
    shortUrl,
    service: serviceId,
    createdAt: new Date().toISOString(),
  };
}
