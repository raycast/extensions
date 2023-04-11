import { getPreferenceValues } from "@raycast/api";
import { SocksProxyAgent } from "socks-proxy-agent";

export function useProxy(): SocksProxyAgent | undefined {
  const prefs = getPreferenceValues<{
    useProxy?: boolean;
    proxyHost?: string;
    proxyPort?: number;
    proxyUsername?: string;
    proxyPassword?: string;
  }>();

  if (!prefs.useProxy || !prefs.proxyHost || !prefs.proxyPort) {
    return undefined;
  }

  let auth = "";

  if (prefs.proxyUsername) {
    auth = `${encodeURIComponent(prefs.proxyUsername)}`;
    if (prefs.proxyPassword) {
      auth = `${auth}:${encodeURIComponent(prefs.proxyPassword)}`;
    }
    auth = `${auth}@`;
  }

  const proxy = `socks5://${auth}${prefs.proxyHost}:${prefs.proxyPort}`;

  return new SocksProxyAgent(proxy);
}
