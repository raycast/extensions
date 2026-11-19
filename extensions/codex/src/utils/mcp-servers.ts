import nodePath from "node:path";
import { isDeepStrictEqual } from "node:util";
import type {
  CodexConfigLayer,
  CodexConfigReadResponse,
  CodexMcpServerStatus,
  McpServerRuntimeStatus,
} from "./app-server";

export type McpTransport = "stdio" | "http" | "unknown";
export type McpSection = "Enabled" | "Disabled" | "Runtime Only";

export type McpServerConfig = Record<string, unknown>;
export type McpServerMap = Record<string, McpServerConfig>;

export type McpConfigLayer = {
  id: string;
  label: string;
  sourcePath: string | null;
  version: string;
  editable: boolean;
  disabledReason: string | null;
  servers: McpServerMap;
};

export type McpServerRecord = {
  name: string;
  transport: McpTransport;
  enabled: boolean | null;
  authStatus: CodexMcpServerStatus["authStatus"] | null;
  runtimeStatus: McpServerRuntimeStatus | null;
  pluginId: string | null;
  tools: string[];
  resourceCount: number;
  resourceTemplateCount: number;
  runtimeAvailable: boolean;
  layer: McpConfigLayer | null;
  contributingLayers: McpConfigLayer[];
  config: McpServerConfig | null;
  editable: boolean;
};

export type McpServerFormValues = {
  name: string;
  transport: "stdio" | "http";
  enabled: boolean;
  command?: string;
  arguments?: string;
  environmentVariables?: string;
  url?: string;
  authentication?: "oauth" | "chatgpt" | "bearerEnvironment";
  bearerTokenEnvironmentName?: string;
  /** One `Name=value` per line. `Name=$VAR` reads the value from the environment. */
  httpHeaders?: string;
  defaultToolApprovalMode?: "" | "prompt" | "writes" | "approve";
  allowedTools?: string[];
  deniedTools?: string[];
};

export type McpServerMutation =
  | { type: "add"; name: string; config: McpServerConfig }
  | {
      type: "replace";
      name: string;
      config: McpServerConfig;
      // Raw layer entry the edit started from. A mismatch means the file
      // changed while the form was open and the save would clobber it.
      expectedConfig: McpServerConfig;
    }
  | { type: "setEnabled"; name: string; enabled: boolean }
  | { type: "remove"; name: string };

export function normalizeMcpConfigLayers(
  response: CodexConfigReadResponse,
): McpConfigLayer[] {
  return (response.layers ?? []).map((layer, index) => {
    const sourceType = getSourceType(layer);
    const sourcePath = getSourcePath(layer);
    const editable =
      !layer.disabledReason &&
      sourceType === "user" &&
      layer.name.profile == null &&
      Boolean(sourcePath);

    return {
      id: `${sourceType}:${layer.name.profile ?? ""}:${sourcePath ?? index}`,
      label: getSourceLabel(layer),
      sourcePath,
      version: layer.version,
      editable,
      disabledReason: layer.disabledReason ?? null,
      servers: normalizeServerMap(asRecord(layer.config)?.mcp_servers),
    };
  });
}

export function joinMcpServers(
  layers: McpConfigLayer[],
  statuses: CodexMcpServerStatus[],
  effectiveServers: McpServerMap = {},
): McpServerRecord[] {
  const statusByName = new Map(statuses.map((status) => [status.name, status]));
  const configuredNames = new Set(
    layers.flatMap((layer) => Object.keys(layer.servers)),
  );
  const names = new Set([
    ...configuredNames,
    ...Object.keys(effectiveServers),
    ...statusByName.keys(),
  ]);

  return [...names]
    .map((name): McpServerRecord => {
      const contributingLayers = layers.filter((layer) =>
        Object.hasOwn(layer.servers, name),
      );
      const layer = contributingLayers.at(-1) ?? null;
      const config =
        (Object.hasOwn(effectiveServers, name)
          ? effectiveServers[name]
          : null) ??
        layer?.servers[name] ??
        null;
      const status = statusByName.get(name) ?? null;
      const enabled = config ? config.enabled !== false : null;
      const editable = Boolean(
        layer?.editable && contributingLayers.length === 1,
      );

      return {
        name,
        transport: getMcpTransport(config),
        enabled,
        authStatus: status?.authStatus ?? null,
        runtimeStatus: status?.runtimeStatus ?? null,
        pluginId: status?.pluginId ?? null,
        tools: status ? Object.keys(status.tools).sort() : [],
        resourceCount: status?.resources.length ?? 0,
        resourceTemplateCount: status?.resourceTemplates.length ?? 0,
        runtimeAvailable: Boolean(status),
        layer,
        contributingLayers,
        config,
        editable,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getEffectiveMcpServerMap(
  response: CodexConfigReadResponse,
): McpServerMap {
  return normalizeServerMap(response.config.mcp_servers);
}

export function partitionMcpServers(records: McpServerRecord[]) {
  const sectionOrder: McpSection[] = ["Enabled", "Disabled", "Runtime Only"];

  return sectionOrder
    .map((title) => ({
      title,
      records: records.filter((record) => getMcpSection(record) === title),
    }))
    .filter((section) => section.records.length > 0);
}

export function buildUpdatedMcpServerMap(
  current: McpServerMap,
  mutation: McpServerMutation,
): McpServerMap {
  const updated = structuredClone(current);

  if (mutation.type === "add") {
    if (Object.hasOwn(updated, mutation.name)) {
      throw new Error(`An MCP server named "${mutation.name}" already exists`);
    }
    setServer(updated, mutation.name, structuredClone(mutation.config));
    return updated;
  }

  if (!Object.hasOwn(updated, mutation.name)) {
    throw new Error(
      `MCP server "${mutation.name}" is no longer in this configuration`,
    );
  }

  if (mutation.type === "remove") {
    delete updated[mutation.name];
  } else if (mutation.type === "setEnabled") {
    setServer(updated, mutation.name, {
      ...updated[mutation.name],
      enabled: mutation.enabled,
    });
  } else {
    if (!isDeepStrictEqual(updated[mutation.name], mutation.expectedConfig)) {
      throw new Error(
        `MCP server "${mutation.name}" changed since you opened it. Refresh and try again.`,
      );
    }
    setServer(updated, mutation.name, structuredClone(mutation.config));
  }

  return updated;
}

// Plain assignment would treat names like __proto__ as the prototype.
function setServer(map: McpServerMap, name: string, config: McpServerConfig) {
  Object.defineProperty(map, name, {
    value: config,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

export function validateMcpServerName(
  value: string | undefined,
  existingNames: string[],
  originalName?: string,
): string | undefined {
  const name = value?.trim() ?? "";
  if (!name) return "Name is required";
  if (!/^[A-Za-z0-9_@:/.-]+$/.test(name)) {
    return "Use only letters, numbers, and the characters - _ . : @ /";
  }
  if (name !== originalName && existingNames.includes(name)) {
    return `An MCP server named "${name}" already exists`;
  }
  return undefined;
}

export function validateMcpHttpUrl(
  value: string | undefined,
): string | undefined {
  if (!value?.trim()) return "URL is required for a remote server";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? undefined
      : "URL must use HTTP or HTTPS";
  } catch {
    return "Enter a valid HTTP or HTTPS URL";
  }
}

export function validateMcpKeyValueLines(
  value: string | undefined,
): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    parseKeyValueLines(value);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid values";
  }
}

export function buildMcpServerConfig(
  values: McpServerFormValues,
  existing?: McpServerConfig,
): McpServerConfig {
  const config = structuredClone(existing ?? {});
  const transportFields =
    values.transport === "stdio"
      ? [
          "url",
          "auth",
          "oauth_resource",
          "oauth",
          "http_headers_helper",
          "scopes",
          "bearer_token_env_var",
          "http_headers",
          "env_http_headers",
        ]
      : ["command", "args", "cwd", "env", "env_vars"];
  for (const field of transportFields) {
    delete config[field];
  }

  config.enabled = values.enabled;
  setOptional(
    config,
    "default_tools_approval_mode",
    values.defaultToolApprovalMode,
  );
  setOptionalList(config, "enabled_tools", values.allowedTools);
  setOptionalList(config, "disabled_tools", values.deniedTools);

  if (values.transport === "stdio") {
    config.command = values.command?.trim();
    setOptionalList(config, "args", values.arguments, "lines");
    setOptionalMap(config, "env", values.environmentVariables);
  } else {
    config.url = values.url?.trim();

    // Omitting `auth` means OAuth in Codex, so "oauth" writes nothing.
    delete config.auth;
    delete config.bearer_token_env_var;
    if (values.authentication === "chatgpt") {
      config.auth = "chatgpt";
    } else if (values.authentication === "bearerEnvironment") {
      setOptional(
        config,
        "bearer_token_env_var",
        values.bearerTokenEnvironmentName,
      );
    }

    const headers = splitMcpHeaders(values.httpHeaders);
    setOptionalMap(config, "http_headers", headers.static);
    setOptionalMap(config, "env_http_headers", headers.environment);
  }

  return config;
}

export function redactMcpServerConfig(config: McpServerConfig): unknown {
  return redactValue(config);
}

function getMcpTransport(config: McpServerConfig | null): McpTransport {
  if (typeof config?.url === "string") {
    return "http";
  }
  if (typeof config?.command === "string") {
    return "stdio";
  }
  return "unknown";
}

function getMcpSection(record: McpServerRecord): McpSection {
  if (!record.config) return "Runtime Only";
  return record.enabled === false ? "Disabled" : "Enabled";
}

function getSourceType(layer: CodexConfigLayer): string {
  return typeof layer.name?.type === "string" ? layer.name.type : "unknown";
}

function getSourcePath(layer: CodexConfigLayer): string | null {
  if (typeof layer.name?.file === "string") {
    return layer.name.file;
  }
  if (typeof layer.name?.dotCodexFolder === "string") {
    return nodePath.join(layer.name.dotCodexFolder, "config.toml");
  }
  return null;
}

function getSourceLabel(layer: CodexConfigLayer): string {
  switch (getSourceType(layer)) {
    case "user":
      return layer.name.profile
        ? `Personal configuration (${String(layer.name.profile)})`
        : "Personal configuration";
    case "project":
      return "Project configuration";
    case "system":
      return "System configuration";
    case "mdm":
      return "Managed configuration";
    case "enterpriseManaged":
      return typeof layer.name.name === "string"
        ? `Enterprise configuration (${layer.name.name})`
        : "Enterprise configuration";
    case "sessionFlags":
      return "Session overrides";
    default:
      return "Managed configuration";
  }
}

function normalizeServerMap(value: unknown): McpServerMap {
  const map = asRecord(value);
  if (!map) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(map).flatMap(([name, config]) => {
      const record = asRecord(config);
      return record ? [[name, structuredClone(record)]] : [];
    }),
  );
}

function setOptional(
  config: McpServerConfig,
  key: string,
  value: string | undefined,
) {
  const normalized = value?.trim();
  if (normalized) {
    config[key] = normalized;
  } else {
    delete config[key];
  }
}

function setOptionalList(
  config: McpServerConfig,
  key: string,
  value: string | string[] | undefined,
  separator: "commas" | "lines" = "commas",
) {
  const values = Array.isArray(value)
    ? value.map((item) => item.trim()).filter(Boolean)
    : parseList(value, separator);
  if (values.length > 0) {
    config[key] = values;
  } else {
    delete config[key];
  }
}

function setOptionalMap(
  config: McpServerConfig,
  key: string,
  value: string | Record<string, string> | undefined,
) {
  const map = typeof value === "string" ? parseKeyValueLines(value) : value;
  if (map && Object.keys(map).length > 0) {
    config[key] = map;
  } else {
    delete config[key];
  }
}

const environmentReference = /^\$([A-Za-z_][A-Za-z0-9_]*)$/;

function splitMcpHeaders(value: string | undefined) {
  const result = {
    static: {} as Record<string, string>,
    environment: {} as Record<string, string>,
  };
  if (!value?.trim()) return result;
  for (const [name, entry] of Object.entries(parseKeyValueLines(value))) {
    const reference = environmentReference.exec(entry);
    if (reference) {
      result.environment[name] = reference[1];
    } else {
      result.static[name] = entry;
    }
  }
  return result;
}

export function formatMcpHeaders(config: McpServerConfig): string {
  return [
    ...formatKeyValueEntries(config.http_headers),
    ...formatKeyValueEntries(config.env_http_headers).map(
      ([name, variable]) => [name, `$${variable}`] as const,
    ),
  ]
    .map(([name, entry]) => `${name}=${entry}`)
    .join("\n");
}

export function formatKeyValueMap(value: unknown): string {
  return formatKeyValueEntries(value)
    .map(([name, entry]) => `${name}=${entry}`)
    .join("\n");
}

function formatKeyValueEntries(value: unknown): [string, string][] {
  const map = asRecord(value);
  if (!map) return [];
  return Object.entries(map).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
}

function parseList(
  value: string | undefined,
  separator: "commas" | "lines",
): string[] {
  return (value ?? "")
    .split(separator === "lines" ? /\r?\n/ : ",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseKeyValueLines(value: string): Record<string, string> {
  return Object.fromEntries(
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const separator = line.indexOf("=");
        if (separator <= 0) {
          throw new Error(`Line ${index + 1} must use NAME=value`);
        }
        const key = line.slice(0, separator).trim();
        const entryValue = line.slice(separator + 1).trim();
        if (!key || !entryValue) {
          throw new Error(`Line ${index + 1} must include a name and value`);
        }
        return [key, entryValue];
      }),
  );
}

function redactValue(value: unknown, parentKey = ""): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, parentKey));
  }
  const record = asRecord(value);
  if (!record) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => {
      const lowerKey = key.toLowerCase();
      if (
        parentKey === "env" ||
        parentKey === "http_headers" ||
        (parentKey !== "env_http_headers" &&
          lowerKey !== "bearer_token_env_var" &&
          /(secret|token|password|credential|authorization|api[_-]?key)/i.test(
            lowerKey,
          ))
      ) {
        return [key, "••••••••"];
      }
      return [key, redactValue(entry, lowerKey)];
    }),
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
