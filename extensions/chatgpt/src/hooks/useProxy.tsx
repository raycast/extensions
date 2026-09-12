import { getPreferenceValues } from "@raycast/api";
import http, { Agent } from "http";
import https from "https";
import { ProxyAgent } from "proxy-agent";
import { getConfigUrl } from "../utils";

export function useProxy(): Agent {
  const prefs = getPreferenceValues<Preferences>();

  if (!prefs.useProxy || !prefs.proxyProtocol || !prefs.proxyHost || !prefs.proxyPort) {
    // Without a custom proxy, reuse the agents Raycast configures for extensions.
    // They trust the system certificate store (and honour the system proxy when it is enabled),
    // whereas the OpenAI SDK's default agent only trusts Node's bundled root certificates,
    // which breaks endpoints behind a TLS-inspecting corporate proxy.
    return /^\s*http:/i.test(getConfigUrl(prefs) ?? "") ? http.globalAgent : https.globalAgent;
  }

  let proxyUrl = `${prefs.proxyProtocol}://${prefs.proxyHost}:${prefs.proxyPort}`;

  if (prefs.proxyUsername && prefs.proxyPassword) {
    proxyUrl = `${prefs.proxyProtocol}://${prefs.proxyUsername}:${prefs.proxyPassword}@${prefs.proxyHost}:${prefs.proxyPort}`;
  }

  return new ProxyAgent({
    getProxyForUrl: () => proxyUrl,
  });
}
