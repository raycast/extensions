import { Agent, globalAgent } from "node:https";
import * as tls from "node:tls";

import fetch, { type RequestInfo, type RequestInit } from "node-fetch";

let agent: Agent | undefined;

export default function jiraFetch(url: RequestInfo, options?: RequestInit) {
  if (!agent && typeof tls.getCACertificates === "function") {
    agent = new Agent({
      ...globalAgent.options,
      ca: [...new Set([...tls.getCACertificates("default"), ...tls.getCACertificates("system")])],
    });
  }

  return fetch(url, { agent: (url) => (url.protocol === "https:" ? agent : undefined), ...options });
}
