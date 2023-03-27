import { getPreferenceValues } from "@raycast/api";
import { AxiosProxyConfig } from "axios";

export function useProxy(): AxiosProxyConfig | undefined {
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

  const config: AxiosProxyConfig = {
    host: prefs.proxyHost,
    port: prefs.proxyPort,
    protocol: prefs.proxyProtocol,
  };

  if (prefs.proxyUsername && prefs.proxyPassword) {
    config.auth = {
      username: prefs.proxyUsername,
      password: prefs.proxyPassword,
    };
  }

  return config;
}
