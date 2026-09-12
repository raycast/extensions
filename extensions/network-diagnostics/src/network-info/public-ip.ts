import fetch from "cross-fetch";

export interface PublicIpInfo {
  ipv4: string;
  org: string;
  country: string;
  region: string;
}

export type PublicIpResult = { info: PublicIpInfo; success: true } | { info: null; success: false };

// Gets information about the public IP address.
export async function publicIp(): Promise<PublicIpResult> {
  const url = "https://ipinfo.io/json";
  try {
    const response = await fetchWithTimeout(url, 1000);
    if (!response.ok) {
      return { info: null, success: false };
    }

    const data = await response.json();
    return { info: { ipv4: data.ip, org: data.org, country: data.country, region: data.region }, success: true };
  } catch (err) {
    return { info: null, success: false };
  }
}

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);
  const response = await fetch(url, { signal: abortController.signal });
  clearTimeout(timeoutId);
  return response;
}
