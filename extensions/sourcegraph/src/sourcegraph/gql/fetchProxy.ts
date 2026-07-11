import http, { Agent } from "http";
import path from "path";
import nodeFetch, { RequestInit, RequestInfo } from "node-fetch";
import crossFetch from "cross-fetch";

// Returns a valid http.Agent, using a proxy when configured.
export function getProxiedAgent(proxy?: string) {
  if (proxy) {
    if (proxy.startsWith("http://") || proxy.startsWith("https://")) {
      throw new Error(`The proxy provided (${proxy}) is not supported. Use a Unix socket proxy or unset this option.`);
    } else {
      let socketPath = proxy;
      if (socketPath.startsWith("unix://")) {
        socketPath = proxy.slice("unix://".length);
      }
      if (socketPath.startsWith("~/") && process.env.HOME !== undefined) {
        socketPath = path.join(process.env.HOME, socketPath.slice(2));
      }
      return new Agent({ socketPath } as unknown as http.AgentOptions);
    }
  }
}

// Returns a fetch function that uses a proxy when configured.
export function getProxiedFetch(proxy?: string): typeof crossFetch {
  const agent = getProxiedAgent(proxy);
  if (!proxy) {
    return crossFetch;
  }
  // YOLO, not sure how to get the types to interop but the actual passed parameters
  // match those used in https://github.com/bobheadxi/raycast-sourcegraph/pull/21.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proxiedFetch = (info: any, init?: any) => {
    return nodeFetch(info as RequestInfo, { ...init, agent } as RequestInit);
  };
  return proxiedFetch as unknown as typeof crossFetch;
}
