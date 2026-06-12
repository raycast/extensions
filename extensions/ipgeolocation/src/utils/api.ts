import { IPData } from "../types";

function isIPData(data: unknown): data is IPData {
  return typeof data === "object" && data !== null && "ip" in data;
}

export async function fetchIPData(
  query: string,
  apiKey: string,
  plan: "free" | "paid" = "free",
): Promise<IPData> {
  const include = "hostname, security, abuse, dma_code, geo_accuracy";

  const params = new URLSearchParams();
  params.set("apiKey", apiKey);
  if (query) params.set("ip", query);
  if (plan === "paid") params.set("include", include);

  const url = `https://api.ipgeolocation.io/v3/ipgeo?${params.toString()}`;

  const res = await fetch(url);

  if (!res.ok) {
    const err: unknown = await res.json().catch(() => ({}));

    let message = `API error: ${res.status}`;

    if (res.status === 401) message = "Invalid API key";
    if (res.status === 429) message = "Rate limit exceeded";

    if (err && typeof err === "object" && "message" in err) {
      message = String((err as { message: unknown }).message);
    }

    throw new Error(message);
  }

  const data: unknown = await res.json();

  if (!isIPData(data)) {
    throw new Error("Malformed API response");
  }

  return data;
}
