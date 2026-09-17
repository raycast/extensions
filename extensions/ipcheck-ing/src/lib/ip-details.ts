import { lookupCache } from "./cache";
import { requestText } from "./http";
import { IPDetails } from "./types";

// ip-api.com's free tier is HTTP-only; TLS is paid, and free HTTPS alternatives omit the
// mobile / proxy / hosting flags this detail view is built around. The list's city column
// uses a separate HTTPS lookup — this path is only hit when the user asks for a full record.
const FIELDS = [
  "status",
  "message",
  "query",
  "continent",
  "country",
  "countryCode",
  "region",
  "regionName",
  "city",
  "district",
  "zip",
  "lat",
  "lon",
  "timezone",
  "offset",
  "isp",
  "org",
  "as",
  "asname",
  "reverse",
  "mobile",
  "proxy",
  "hosting",
].join(",");

interface DetailsResponse extends Omit<IPDetails, "ip"> {
  status: "success" | "fail";
  message?: string;
  query: string;
}

export async function fetchIPDetails(ip: string): Promise<IPDetails> {
  const cached = lookupCache.read<IPDetails>(detailsKey(ip));
  if (cached) return cached;

  const body = await requestText(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${FIELDS}`, {
    accept: "application/json",
  });

  const payload = JSON.parse(body) as DetailsResponse;
  if (payload.status !== "success") {
    throw new Error(payload.message ?? "The lookup service could not resolve this address");
  }

  const details: IPDetails = { ...payload, ip: payload.query };
  lookupCache.write(detailsKey(ip), details);

  return details;
}

function detailsKey(ip: string): string {
  return `details:${ip}`;
}

/** ip-api.com reports the UTC offset in seconds; show it the way people write it. */
export function formatUTCOffset(offsetSeconds: number | undefined): string | undefined {
  if (offsetSeconds === undefined) return undefined;

  const sign = offsetSeconds < 0 ? "-" : "+";
  const total = Math.abs(offsetSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
