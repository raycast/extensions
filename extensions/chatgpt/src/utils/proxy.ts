import { ProxyAgent, fetch as undiciFetch } from "undici";

export function proxyClientOptions(preferences: Preferences) {
  if (!preferences.useProxy || !preferences.proxyProtocol || !preferences.proxyHost || !preferences.proxyPort) {
    return {};
  }

  const url = new URL(`${preferences.proxyProtocol}://${preferences.proxyHost}:${preferences.proxyPort}`);
  if (preferences.proxyUsername) url.username = preferences.proxyUsername;
  if (preferences.proxyPassword) url.password = preferences.proxyPassword;

  return {
    fetch: undiciFetch as unknown as typeof fetch,
    fetchOptions: { dispatcher: new ProxyAgent(url.toString()) },
  };
}
