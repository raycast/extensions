import nodeFetch from "node-fetch";
import { ProxyAgent } from "proxy-agent";
import { getPreferenceValues } from "@raycast/api";

function fetch(url, options) {
  const pref = getPreferenceValues();

  if (!pref["proxy"]) {
    return nodeFetch(url, options);
  }

  const agent = new ProxyAgent({ getProxyForUrl: () => pref["proxy"] });

  return nodeFetch(url, {
    ...options,
    agent,
  });
}

globalThis.fetch = fetch;
