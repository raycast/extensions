import assert from "node:assert/strict";
import test from "node:test";
import type {
  CodexConfigReadResponse,
  CodexMcpServerStatus,
} from "./app-server";
const mcpServersModulePath = "./mcp-servers.ts";
let mcpServers = null as unknown as typeof import("./mcp-servers");

test.before(async () => {
  mcpServers = await import(mcpServersModulePath);
});

const configReadResponse: CodexConfigReadResponse = {
  config: {},
  origins: {},
  layers: [
    {
      name: { type: "user", file: "/tmp/codex/config.toml" },
      version: "user-v1",
      config: {
        mcp_servers: {
          context7: {
            url: "https://mcp.example.com",
            enabled: true,
            bearer_token_env_var: "CONTEXT7_TOKEN",
            http_headers: { Authorization: "secret" },
            unknown_field: { keep: true },
          },
          disabled: { command: "npx", args: ["server"], enabled: false },
          enabled_without_status: { command: "local-server" },
        },
      },
    },
    {
      name: { type: "project", dotCodexFolder: "/tmp/project/.codex" },
      version: "project-v1",
      config: { mcp_servers: { project_server: { command: "project" } } },
    },
    {
      name: { type: "system", file: "/etc/codex/config.toml" },
      version: "system-v1",
      config: { mcp_servers: { managed: { url: "https://managed.example" } } },
    },
  ],
};

const statuses: CodexMcpServerStatus[] = [
  {
    name: "context7",
    authStatus: "notLoggedIn",
    tools: {
      search: { name: "search" },
      resolve: { name: "resolve" },
    },
    resources: [{ name: "docs", uri: "docs://" }],
    resourceTemplates: [],
    serverInfo: { name: "Context7", version: "1.0.0" },
  },
  {
    name: "disabled",
    authStatus: "unsupported",
    tools: {},
    resources: [],
    resourceTemplates: [],
    serverInfo: null,
  },
  {
    name: "runtime_only",
    authStatus: "oAuth",
    runtimeStatus: "connected",
    pluginId: "record-and-replay@openai-bundled",
    tools: {},
    resources: [],
    resourceTemplates: [{ name: "template", uriTemplate: "docs://{id}" }],
    serverInfo: null,
  },
];

test("normalizes user, project, and managed configuration layers", () => {
  const layers = mcpServers.normalizeMcpConfigLayers(configReadResponse);

  assert.equal(layers[0].label, "Personal configuration");
  assert.equal(layers[0].editable, true);
  assert.equal(layers[1].label, "Project configuration");
  assert.equal(layers[1].sourcePath, "/tmp/project/.codex/config.toml");
  assert.equal(
    layers[1].editable,
    false,
    "Codex 0.146.0 rejects project-layer writes as configLayerReadonly",
  );
  assert.equal(layers[2].label, "System configuration");
  assert.equal(layers[2].editable, false);
});

test("keeps profile configuration locked because writes only target the base user layer", () => {
  const response = structuredClone(configReadResponse);
  response.layers?.push({
    name: {
      type: "user",
      file: "/tmp/codex/config.toml",
      profile: "work",
    },
    version: "profile-v1",
    config: { mcp_servers: { profile_server: { command: "profile" } } },
  });

  const profileLayer = mcpServers.normalizeMcpConfigLayers(response).at(-1);
  assert.equal(profileLayer?.label, "Personal configuration (work)");
  assert.equal(profileLayer?.editable, false);
  assert.notEqual(
    profileLayer?.id,
    mcpServers.normalizeMcpConfigLayers(response)[0].id,
  );
});

test("joins configuration and status without making runtime-only or managed servers editable", () => {
  const records = mcpServers.joinMcpServers(
    mcpServers.normalizeMcpConfigLayers(configReadResponse),
    statuses,
  );
  const byName = Object.fromEntries(
    records.map((record) => [record.name, record]),
  );

  assert.equal(byName.context7.authStatus, "notLoggedIn");
  assert.equal(byName.context7.transport, "http");
  assert.deepEqual(byName.context7.tools, ["resolve", "search"]);
  assert.equal(byName.disabled.runtimeAvailable, true);
  assert.equal(byName.runtime_only.config, null);
  assert.equal(byName.runtime_only.editable, false);
  assert.equal(byName.runtime_only.runtimeStatus, "connected");
  assert.equal(
    byName.runtime_only.pluginId,
    "record-and-replay@openai-bundled",
  );
  assert.equal(byName.context7.runtimeStatus, null);
  assert.equal(byName.managed.editable, false);

  assert.deepEqual(
    mcpServers.partitionMcpServers(records).map((section) => ({
      title: section.title,
      names: section.records.map((record) => record.name),
    })),
    [
      {
        title: "Enabled",
        names: [
          "context7",
          "enabled_without_status",
          "managed",
          "project_server",
        ],
      },
      { title: "Disabled", names: ["disabled"] },
      { title: "Runtime Only", names: ["runtime_only"] },
    ],
  );
});

test("locks a server configured by multiple layers", () => {
  const response = structuredClone(configReadResponse);
  const layers = response.layers ?? [];
  (layers[1].config as Record<string, unknown>).mcp_servers = {
    context7: { enabled: false },
  };
  response.config.mcp_servers = {
    context7: {
      url: "https://mcp.example.com",
      enabled: false,
      unknown_field: { keep: true },
    },
  };
  const context7 = mcpServers
    .joinMcpServers(
      mcpServers.normalizeMcpConfigLayers(response),
      statuses,
      mcpServers.getEffectiveMcpServerMap(response),
    )
    .find((record) => record.name === "context7");

  assert.equal(context7?.enabled, false);
  assert.equal(context7?.transport, "http");
  assert.deepEqual(context7?.config?.unknown_field, { keep: true });
  assert.equal(context7?.editable, false);
  assert.equal(context7?.contributingLayers.length, 2);
});

test("redacts secret values while retaining safe environment variable names", () => {
  const redacted = mcpServers.redactMcpServerConfig({
    env: { API_KEY: "env-secret" },
    http_headers: { Authorization: "header-secret" },
    env_http_headers: { Authorization: "AUTH_ENV" },
    bearer_token_env_var: "TOKEN_ENV",
    nested: { password: "nested-secret" },
  });

  assert.deepEqual(redacted, {
    env: { API_KEY: "••••••••" },
    http_headers: { Authorization: "••••••••" },
    env_http_headers: { Authorization: "AUTH_ENV" },
    bearer_token_env_var: "TOKEN_ENV",
    nested: { password: "••••••••" },
  });
});

test("builds all named mutations without changing unrelated or unknown fields", () => {
  const original = {
    existing: { command: "old", unknown: { keep: true } },
    unrelated: { url: "https://unrelated.example", custom: 7 },
  };
  const added = mcpServers.buildUpdatedMcpServerMap(original, {
    type: "add",
    name: "new_server",
    config: { command: "new" },
  });
  const edited = mcpServers.buildUpdatedMcpServerMap(added, {
    type: "replace",
    name: "existing",
    config: { command: "edited", unknown: { keep: true } },
    expectedConfig: original.existing,
  });
  const disabled = mcpServers.buildUpdatedMcpServerMap(edited, {
    type: "setEnabled",
    name: "existing",
    enabled: false,
  });
  const enabled = mcpServers.buildUpdatedMcpServerMap(disabled, {
    type: "setEnabled",
    name: "existing",
    enabled: true,
  });
  const removed = mcpServers.buildUpdatedMcpServerMap(enabled, {
    type: "remove",
    name: "new_server",
  });

  assert.deepEqual(original.existing, {
    command: "old",
    unknown: { keep: true },
  });
  assert.equal(removed.existing.command, "edited");
  assert.deepEqual(removed.existing.unknown, { keep: true });
  assert.deepEqual(removed.unrelated, original.unrelated);
  assert.equal(removed.existing.enabled, true);
  assert.equal("new_server" in removed, false);
  assert.throws(
    () =>
      mcpServers.buildUpdatedMcpServerMap(original, {
        type: "add",
        name: "existing",
        config: {},
      }),
    /already exists/,
  );
  assert.throws(
    () =>
      mcpServers.buildUpdatedMcpServerMap(original, {
        type: "replace",
        name: "existing",
        config: { command: "mine" },
        expectedConfig: { command: "someone-elses" },
      }),
    /changed since you opened it/,
  );
});

test("treats inherited object property names as ordinary server names", () => {
  const withConstructor = mcpServers.buildUpdatedMcpServerMap(
    {},
    { type: "add", name: "constructor", config: { command: "c" } },
  );
  assert.deepEqual(withConstructor.constructor, { command: "c" });
  assert.throws(
    () =>
      mcpServers.buildUpdatedMcpServerMap(
        {},
        { type: "remove", name: "toString" },
      ),
    /no longer in this configuration/,
  );
  const withProto = mcpServers.buildUpdatedMcpServerMap(
    {},
    { type: "add", name: "__proto__", config: { command: "p" } },
  );
  assert.equal(Object.getPrototypeOf(withProto), Object.prototype);
  assert.deepEqual(Object.keys(withProto), ["__proto__"]);
});

test("builds stdio and HTTP configs while preserving unknown fields", () => {
  const existing = {
    url: "https://old.example",
    auth: "oauth",
    scopes: ["read"],
    oauth_resource: "https://old.example",
    http_headers: { Authorization: "existing-secret" },
    cwd: "/srv/tool",
    unknown: { keep: true },
  };
  const http = mcpServers.buildMcpServerConfig(
    {
      name: "remote",
      transport: "http",
      enabled: true,
      url: "https://new.example/mcp",
      authentication: "bearerEnvironment",
      bearerTokenEnvironmentName: "MCP_TOKEN",
      httpHeaders: "x-api-key=rotated-secret\nx-region=$REGION",
      allowedTools: ["search", "resolve"],
    },
    existing,
  );
  assert.deepEqual(http, {
    url: "https://new.example/mcp",
    scopes: ["read"],
    oauth_resource: "https://old.example",
    unknown: { keep: true },
    enabled: true,
    enabled_tools: ["search", "resolve"],
    bearer_token_env_var: "MCP_TOKEN",
    http_headers: { "x-api-key": "rotated-secret" },
    env_http_headers: { "x-region": "REGION" },
  });
  assert.equal(
    mcpServers.formatMcpHeaders(http),
    "x-api-key=rotated-secret\nx-region=$REGION",
  );

  const oauth = mcpServers.buildMcpServerConfig(
    {
      name: "remote",
      transport: "http",
      enabled: true,
      url: "https://new.example/mcp",
      authentication: "oauth",
      httpHeaders: "",
    },
    existing,
  );
  assert.equal("auth" in oauth, false, "OAuth is Codex's default");
  assert.equal("http_headers" in oauth, false);
  assert.equal("bearer_token_env_var" in oauth, false);

  const stdio = mcpServers.buildMcpServerConfig(
    {
      name: "local",
      transport: "stdio",
      enabled: false,
      command: "npx",
      arguments: "-y\nserver-package",
      environmentVariables: "API_KEY=secret",
    },
    existing,
  );
  assert.deepEqual(stdio, {
    unknown: { keep: true },
    cwd: "/srv/tool",
    enabled: false,
    command: "npx",
    args: ["-y", "server-package"],
    env: { API_KEY: "secret" },
  });
});

test("accepts package-style server names", () => {
  for (const name of ["@company/tools", "package.server", "provider:server"]) {
    assert.equal(mcpServers.validateMcpServerName(name, []), undefined);
  }
  assert.ok(mcpServers.validateMcpServerName("bad name", []));
});

test("transport switches remove incompatible config and preserve unrelated options", () => {
  const stdio = mcpServers.buildMcpServerConfig(
    { name: "server", transport: "stdio", enabled: true, command: "node" },
    {
      url: "https://example.test/mcp",
      oauth: { client_id: "public-client" },
      http_headers_helper: "get-headers",
      tool_timeout_sec: 60,
    },
  );
  assert.deepEqual(stdio, {
    command: "node",
    enabled: true,
    tool_timeout_sec: 60,
  });
  const http = mcpServers.buildMcpServerConfig(
    {
      name: "server",
      transport: "http",
      enabled: true,
      url: "https://example.test/mcp",
    },
    { command: "node", env_vars: ["TOKEN"], tool_timeout_sec: 60 },
  );
  assert.deepEqual(http, {
    url: "https://example.test/mcp",
    enabled: true,
    tool_timeout_sec: 60,
  });
});
