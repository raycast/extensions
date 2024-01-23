import { getPreferenceValues } from "@raycast/api";
import { Agent } from "http";
import { HttpsProxyAgent } from "https-proxy-agent";

export function useProxy(): Agent | undefined {
  const prefs = getPreferenceValues<{
    useProxy?: boolean;
    proxyProtocol?: string;
    proxyHost?: string;
    proxyPort?: number;
    proxyUsername?: string;
    proxyPassword?: string;
  }>();

  if (!prefs.useProxy || !prefs.proxyProtocol || !prefs.proxyHost || !prefs.proxyPort) {
    return undefined;
  }

  let url = `${prefs.proxyProtocol}://${prefs.proxyHost}:${prefs.proxyPort}`;

  if (prefs.proxyUsername && prefs.proxyPassword) {
    url = `${prefs.proxyProtocol}://${prefs.proxyUsername}:${prefs.proxyPassword}@${prefs.proxyHost}:${prefs.proxyPort}`;
  }
  return new HttpsProxyAgent(url);
}
