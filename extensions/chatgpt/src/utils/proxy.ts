import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import nodeFetch from "node-fetch";
import { Readable } from "node:stream";

export function proxyClientOptions(preferences: Preferences) {
  if (!preferences.useProxy || !preferences.proxyProtocol || !preferences.proxyHost || !preferences.proxyPort) {
    return {};
  }

  const url = new URL(`${preferences.proxyProtocol}://${preferences.proxyHost}:${preferences.proxyPort}`);
  if (preferences.proxyUsername) url.username = preferences.proxyUsername;
  if (preferences.proxyPassword) url.password = preferences.proxyPassword;

  const proxyUrl = url.toString();
  const httpAgent =
    preferences.proxyProtocol === "socks5" ? new SocksProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);
  const httpsAgent =
    preferences.proxyProtocol === "socks5" ? new SocksProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl);
  const fetchThroughProxy: typeof fetch = async (input, init) => {
    const destination = String(input);
    const agent = destination.startsWith("https:") ? httpsAgent : httpAgent;
    const response = await nodeFetch(destination, { ...init, agent } as Parameters<typeof nodeFetch>[1]);
    return new Response(
      response.body ? (Readable.toWeb(response.body as unknown as Readable) as ReadableStream) : null,
      {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      },
    );
  };

  return { fetch: fetchThroughProxy };
}
