import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Agent, createServer, globalAgent } from "node:https";
import * as tls from "node:tls";
import { test } from "node:test";

import fetch, { Headers, Response } from "node-fetch";
import { type RequestInit } from "node-fetch";

import { parseJiraResponse } from "../src/api/response.ts";
import { loadModule } from "./helpers/loadModule.ts";

type RequestModule = {
  request: (path: string) => Promise<unknown>;
  getAuthenticatedUri: (uri: string, contentType: string) => Promise<string>;
  autocomplete: (uri: string, params: Record<string, string>) => Promise<unknown>;
};

const credentials = {
  cloudId: "cloud-id",
  siteUrl: "https://example.atlassian.net",
  authorizationHeader: "Bearer test-token",
};

test("image requests send credentials only to the selected HTTPS Jira site or gateway", async () => {
  const calls: Array<{ url: string; headers: RequestInit["headers"] }> = [];
  const fakeFetch = async (url: string, options: RequestInit) => {
    calls.push({ url, headers: options.headers });
    return new Response("image");
  };
  const api = loadModule<RequestModule>("src/api/request.ts", {
    "./fetch": fakeFetch,
    "node-fetch": fakeFetch,
    "../api/jiraCredentials": { getJiraCredentials: () => credentials },
    "./response": { parseJiraResponse },
  });
  const untrusted = [
    "https://external.example/icon.png",
    "//external.example/icon.png",
    "http://example.atlassian.net/icon.png",
    "https://example.atlassian.net.attacker.example/icon.png",
    "https://api.atlassian.com/ex/jira/other-cloud/rest/icon.png",
    "https://api.atlassian.com/ex/jira/cloud-id-attacker/rest/icon.png",
  ];
  for (const url of untrusted) await api.getAuthenticatedUri(url, "image/png");
  assert.ok(calls.every((call) => new Headers(call.headers).get("authorization") === null));
  await api.getAuthenticatedUri("https://example.atlassian.net/rest/api/2/avatar/1", "image/png");
  assert.deepEqual(calls.at(-1)?.headers, { Authorization: "Bearer test-token" });
});

test("autocomplete rejects destinations outside the selected HTTPS Jira site before fetching", async () => {
  let calls = 0;
  const fakeFetch = async () => {
    calls += 1;
    return new Response("[]");
  };
  const api = loadModule<RequestModule>("src/api/request.ts", {
    "./fetch": fakeFetch,
    "node-fetch": fakeFetch,
    "../api/jiraCredentials": { getJiraCredentials: () => credentials },
    "./response": { parseJiraResponse },
  });
  for (const url of [
    "https://external.example/rest/api/3/user/search",
    "//external.example/rest/api/3/user/search",
    "http://example.atlassian.net/rest/api/3/user/search",
    "https://api.atlassian.com/ex/jira/other-cloud/rest/api/3/user/search",
  ]) {
    await assert.rejects(api.autocomplete(url, { query: "Jane" }), /outside the selected site/);
  }
  assert.equal(calls, 0);
});

test("OAuth avatar requests use the gateway for tenant REST URLs", async () => {
  const urls: string[] = [];
  const fakeFetch = async (url: string) => {
    urls.push(url);
    return new Response("image");
  };
  const api = loadModule<RequestModule>("src/api/request.ts", {
    "./fetch": fakeFetch,
    "node-fetch": fakeFetch,
    "../api/jiraCredentials": { getJiraCredentials: () => credentials },
    "./response": { parseJiraResponse },
  });

  await api.getAuthenticatedUri(
    "https://example.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10556?size=small",
    "image/png",
  );
  await api.getAuthenticatedUri("/rest/api/2/universal_avatar/view/type/issuetype/avatar/10556", "image/png");
  await api.getAuthenticatedUri("https://cdn.example.com/icon.png", "image/png");
  await api.getAuthenticatedUri("https://api.atlassian.com/ex/jira/cloud-id/rest/api/2/avatar/1", "image/png");
  assert.deepEqual(urls, [
    "https://api.atlassian.com/ex/jira/cloud-id/rest/api/2/universal_avatar/view/type/issuetype/avatar/10556?size=small",
    "https://api.atlassian.com/ex/jira/cloud-id/rest/api/2/universal_avatar/view/type/issuetype/avatar/10556",
    "https://cdn.example.com/icon.png",
    "https://api.atlassian.com/ex/jira/cloud-id/rest/api/2/avatar/1",
  ]);
});

test("OAuth autocomplete uses the gateway and preserves Jira query parameters", async () => {
  let requestedUrl = "";
  const fakeFetch = async (url: string) => {
    requestedUrl = url;
    return new Response("[]", { headers: { "content-type": "application/json" } });
  };
  const api = loadModule<RequestModule>("src/api/request.ts", {
    "./fetch": fakeFetch,
    "node-fetch": fakeFetch,
    "../api/jiraCredentials": { getJiraCredentials: () => credentials },
    "./response": { parseJiraResponse },
  });
  await api.autocomplete("https://example.atlassian.net/rest/api/3/user/assignable/search?project=ABC", {
    query: "Jane Doe",
  });
  assert.equal(
    requestedUrl,
    "https://api.atlassian.com/ex/jira/cloud-id/rest/api/3/user/assignable/search?project=ABC&query=Jane+Doe",
  );
});

test("Jira HTTPS transport accepts a system CA and still rejects unknown certificates", async () => {
  const cert = readFileSync(new URL("./fixtures/tls/cert.pem", import.meta.url), "utf8");
  const key = readFileSync(new URL("./fixtures/tls/key.pem", import.meta.url));
  const server = createServer({ key, cert }, (_req, res) => res.end('{"ok":true}'));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `https://127.0.0.1:${address.port}`;
  try {
    await assert.rejects(fetch(url), /self-signed certificate/);
    const transport = loadModule<{ default: typeof fetch }>("src/api/fetch.ts", {
      "node-fetch": fetch,
      "node:tls": {
        ...tls,
        getCACertificates: (kind: string) => (kind === "system" ? [cert] : tls.rootCertificates),
      },
    }).default;
    const response = await transport(url);
    assert.deepEqual(await response.json(), { ok: true });

    const untrustedTransport = loadModule<{ default: typeof fetch }>("src/api/fetch.ts", {
      "node-fetch": fetch,
      "node:tls": {
        ...tls,
        getCACertificates: (kind: string) => (kind === "system" ? [] : tls.rootCertificates),
      },
    }).default;
    await assert.rejects(untrustedTransport(url), /self-signed certificate/);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("Jira TLS agent preserves Node's existing HTTPS proxy and connection options", async () => {
  let agentOptions: unknown;
  const proxyEnv = { HTTPS_PROXY: "http://proxy.example:8080" };
  const transport = loadModule<{ default: typeof fetch }>("src/api/fetch.ts", {
    "node-fetch": async () => new Response("ok"),
    "node:tls": { getCACertificates: () => [] },
    "node:https": {
      globalAgent: { options: { keepAlive: true, proxyEnv } },
      Agent: class extends Agent {
        constructor(options: import("node:https").AgentOptions) {
          super(options);
          agentOptions = options;
        }
      },
    },
  }).default;
  await transport("https://example.atlassian.net");
  assert.deepEqual(agentOptions, { keepAlive: true, proxyEnv, ca: [] });
});

test("runtimes without system CA support keep using the default fetch agent", async () => {
  let observedAgent: unknown = "not called";
  const transport = loadModule<{ default: typeof fetch }>("src/api/fetch.ts", {
    "node-fetch": async (_url: string, options: RequestInit) => {
      assert.equal(typeof options.agent, "function");
      if (typeof options.agent === "function") observedAgent = options.agent(new URL("https://example.atlassian.net"));
      return new Response("ok");
    },
    "node:tls": { getCACertificates: undefined },
    "node:https": { Agent, globalAgent },
  }).default;
  await transport("https://example.atlassian.net");
  assert.equal(observedAgent, undefined);
});
