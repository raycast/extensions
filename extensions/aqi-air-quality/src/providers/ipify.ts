import { fetchJson } from "./http";

const IPIFY_URL = "https://api.ipify.org?format=json";

export async function fetchPublicIp(): Promise<string> {
  const data = await fetchJson<{ ip?: string }>(IPIFY_URL);
  if (!data.ip) {
    throw new Error("Unable to determine public IP address.");
  }
  return data.ip;
}
