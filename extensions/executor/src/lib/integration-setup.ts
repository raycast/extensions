import { listIntegrations, request } from "./client";
import { endpointUrl, lookupCatalogItem, resolveCatalogItem, type CatalogItem, type CatalogKind } from "./catalog";

type AuthTemplateValue = string | (string | { type: "variable"; name: string })[];
type ApiKeyTemplate = {
  type: "apiKey";
  slug?: string;
  label?: string;
  headers?: Record<string, AuthTemplateValue>;
  queryParams?: Record<string, AuthTemplateValue>;
};

export interface IntegrationSetupDefaults {
  kind?: CatalogKind;
  domain?: string;
  catalogSlug?: string;
  endpoint?: string;
}

export interface IntegrationSetupInput {
  kind: CatalogKind;
  endpoint: string;
  name: string;
  slug: string;
  description?: string;
  authentication?: {
    kind: "none" | "oauth2" | "apiKey";
    carrier?: "header" | "query";
    name?: string;
    prefix?: string;
  };
  catalog?: Pick<CatalogItem, "domain" | "slug" | "auth" | "specOverrides">;
}

interface McpProbe {
  connected: boolean;
  requiresAuthentication: boolean;
  requiresOAuth: boolean;
  supportsDynamicRegistration: boolean;
  name: string;
  slug: string;
  toolCount: number | null;
  serverName: string | null;
  instructions: string | null;
  versionNegotiation?: "auto" | "legacy";
}

interface OpenApiPreview {
  title?: string;
  description?: string;
  version?: string;
  servers: { url: string; variables?: Record<string, { default: string }> }[];
  operationCount: number;
  tags: string[];
  headerPresets: {
    label: string;
    headers: Record<string, string | null>;
    secretHeaders: string[];
    secretQueryParams?: string[];
  }[];
  oauth2Presets: {
    label: string;
    securitySchemeName: string;
    flow: "authorizationCode" | "clientCredentials";
    authorizationUrl?: string;
    tokenUrl: string;
    resource?: string;
    scopes: Record<string, string>;
    identityScopes: "auto" | false | string[];
    supportsClientIdMetadataDocument?: boolean;
  }[];
}

interface GraphqlPreview {
  deferredUntilConnection: true;
}

export type IntegrationSetupPreview =
  | { kind: "mcp"; fingerprint: string; result: McpProbe }
  | { kind: "openapi"; fingerprint: string; result: OpenApiPreview }
  | { kind: "graphql"; fingerprint: string; result: GraphqlPreview };

export interface IntegrationCreationResult {
  slug: string;
  name: string;
  kind: CatalogKind;
  toolCount?: number;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function slugifyIntegrationName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function displayNameFromEndpoint(endpoint: string, kind: CatalogKind): string {
  let host = "";
  try {
    host = new URL(endpoint).hostname;
  } catch {
    return kind === "openapi" ? "API" : kind === "graphql" ? "GraphQL" : "MCP";
  }
  const label = host.replace(/^www\./, "").split(".")[0] ?? "";
  const name = label
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
  return `${name || "Custom"} ${kind === "openapi" ? "API" : kind === "graphql" ? "GraphQL" : "MCP"}`;
}

function strictEndpoint(value: string, allowCatalogQuery = false): string {
  const endpoint = endpointUrl(value.trim());
  if (!endpoint) throw new Error("Enter an HTTPS URL or a local HTTP URL without embedded credentials.");
  const parsed = new URL(endpoint);
  if ((!allowCatalogQuery && parsed.search) || parsed.hash) {
    throw new Error("Remove endpoint query parameters or use advanced setup in Executor.");
  }
  return endpoint;
}

function openApiSpec(value: string, allowCatalogQuery = false): string {
  const spec = value.trim();
  if (!spec) throw new Error("Enter an OpenAPI specification URL or raw JSON or YAML.");
  if (/^https?:\/\//i.test(spec) || /^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(spec)) {
    return strictEndpoint(spec, allowCatalogQuery);
  }
  if (/^[{[]/.test(spec) || /^(?:openapi|swagger)\s*:/m.test(spec)) return spec;
  throw new Error("Enter an OpenAPI specification URL or raw JSON or YAML.");
}

export function normalizeIntegrationSetupInput(input: IntegrationSetupInput): IntegrationSetupInput {
  if (!["mcp", "openapi", "graphql"].includes(input.kind)) throw new Error("Choose an integration type.");
  if (input.authentication && !["none", "oauth2", "apiKey"].includes(input.authentication.kind)) {
    throw new Error("Choose a supported authentication method.");
  }
  if (input.authentication?.kind === "oauth2" && input.kind !== "mcp") {
    throw new Error("Native OAuth declaration is supported for MCP. OpenAPI OAuth is read from the specification.");
  }
  if (input.authentication?.kind === "apiKey" && !input.authentication.name?.trim()) {
    throw new Error("Enter the API key header or query parameter name.");
  }
  const catalogQuery = Boolean(input.catalog?.domain);
  const endpoint =
    input.kind === "openapi" ? openApiSpec(input.endpoint, catalogQuery) : strictEndpoint(input.endpoint, catalogQuery);
  const name = input.name.trim();
  const slug = slugifyIntegrationName(input.slug);
  if (!name) throw new Error("Enter a display name.");
  if (!slug) throw new Error("Enter a namespace using letters, numbers, or underscores.");
  if (input.slug !== slug) throw new Error("Namespace must use lowercase letters, numbers, and underscores.");
  const unsupported = advancedSetupReason(input);
  if (unsupported) throw new Error(unsupported);
  return {
    kind: input.kind,
    endpoint,
    name,
    slug,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(input.authentication
      ? {
          authentication: {
            kind: input.authentication.kind,
            ...(input.authentication.carrier ? { carrier: input.authentication.carrier } : {}),
            ...(input.authentication.name?.trim() ? { name: input.authentication.name.trim() } : {}),
            ...(input.authentication.prefix !== undefined ? { prefix: input.authentication.prefix } : {}),
          },
        }
      : {}),
    ...(input.catalog ? { catalog: input.catalog } : {}),
  };
}

function fingerprint(input: IntegrationSetupInput): string {
  return JSON.stringify(normalizeIntegrationSetupInput(input));
}

export async function resolveIntegrationSetupDefaults(
  defaults: IntegrationSetupDefaults = {},
  item?: CatalogItem,
): Promise<IntegrationSetupInput> {
  const resolved = item
    ? await resolveCatalogItem(item)
    : defaults.domain
      ? await lookupCatalogItem(defaults.domain, defaults.kind ?? "mcp", defaults.catalogSlug)
      : undefined;
  const kind = resolved?.kind ?? defaults.kind ?? "mcp";
  const endpoint = resolved?.url ?? defaults.endpoint ?? "";
  const name = resolved?.title ?? (endpoint ? displayNameFromEndpoint(endpoint, kind) : "");
  const slug = resolved?.slug ?? defaults.catalogSlug ?? slugifyIntegrationName(name);
  return {
    kind,
    endpoint,
    name,
    slug,
    ...(resolved?.description ? { description: resolved.description } : {}),
    ...(resolved
      ? {
          catalog: {
            domain: resolved.domain,
            ...(resolved.slug ? { slug: resolved.slug } : {}),
            ...(resolved.auth ? { auth: resolved.auth } : {}),
            ...(resolved.specOverrides ? { specOverrides: resolved.specOverrides } : {}),
          },
        }
      : defaults.domain
        ? { catalog: { domain: defaults.domain, ...(defaults.catalogSlug ? { slug: defaults.catalogSlug } : {}) } }
        : {}),
  };
}

function validateMcpProbe(value: unknown): McpProbe {
  const row = record(value);
  if (
    !row ||
    typeof row.connected !== "boolean" ||
    typeof row.requiresAuthentication !== "boolean" ||
    typeof row.requiresOAuth !== "boolean" ||
    typeof row.supportsDynamicRegistration !== "boolean" ||
    typeof row.name !== "string" ||
    typeof row.slug !== "string" ||
    !(row.toolCount === null || typeof row.toolCount === "number") ||
    !(row.serverName === null || typeof row.serverName === "string") ||
    !(row.instructions === null || typeof row.instructions === "string")
  ) {
    throw new Error("Executor returned an unexpected MCP probe response.");
  }
  if ((!row.connected && !row.requiresAuthentication) || (row.requiresOAuth && !row.requiresAuthentication)) {
    throw new Error("Executor did not confirm a usable MCP endpoint or authentication challenge.");
  }
  return row as unknown as McpProbe;
}

function validateOpenApiPreview(value: unknown): OpenApiPreview {
  const row = record(value);
  if (
    !row ||
    !Array.isArray(row.servers) ||
    typeof row.operationCount !== "number" ||
    !Array.isArray(row.tags) ||
    !Array.isArray(row.headerPresets) ||
    !Array.isArray(row.oauth2Presets)
  ) {
    throw new Error("Executor returned an unexpected OpenAPI preview response.");
  }
  return row as unknown as OpenApiPreview;
}

export async function validateIntegrationSetup(input: IntegrationSetupInput): Promise<IntegrationSetupPreview> {
  const exact = normalizeIntegrationSetupInput(input);
  const key = fingerprint(exact);
  if (exact.kind === "mcp") {
    const result = validateMcpProbe(
      await request<unknown>("/api/mcp/probe", {
        method: "POST",
        body: JSON.stringify({ endpoint: exact.endpoint }),
      }),
    );
    return { kind: "mcp", fingerprint: key, result };
  }
  if (exact.kind === "openapi") {
    const result = validateOpenApiPreview(
      await request<unknown>("/api/openapi/preview", {
        method: "POST",
        body: JSON.stringify({
          spec: exact.endpoint,
          ...(exact.catalog?.specOverrides?.length ? { specOverrides: exact.catalog.specOverrides } : {}),
        }),
      }),
    );
    return { kind: "openapi", fingerprint: key, result };
  }
  return { kind: "graphql", fingerprint: key, result: { deferredUntilConnection: true } };
}

export const previewIntegration = validateIntegrationSetup;

function variable(name: string) {
  return { type: "variable" as const, name };
}

function catalogHeaderTemplate(input: IntegrationSetupInput): ApiKeyTemplate | undefined {
  const pattern = input.catalog?.auth?.header?.trim();
  if (!pattern) return undefined;
  const separator = pattern.indexOf(":");
  if (separator < 1) throw new Error("This catalog authentication pattern needs advanced setup in Executor.");
  const header = pattern.slice(0, separator).trim();
  const value = pattern.slice(separator + 1).trim();
  const match = /^(.*)\{([a-zA-Z][a-zA-Z0-9_]*)\}$/.exec(value);
  if (!header || !match) throw new Error("This catalog authentication pattern needs advanced setup in Executor.");
  return {
    type: "apiKey",
    label: "Catalog authentication",
    headers: { [header]: [...(match[1] ? [match[1]] : []), variable(match[2])] },
  };
}

function appendCatalogTemplate(templates: unknown[], input: IntegrationSetupInput): unknown[] {
  if (input.authentication) return templates;
  const catalog = catalogHeaderTemplate(input);
  if (!catalog) return templates;
  const encoded = JSON.stringify(catalog.headers);
  return templates.some((template) => JSON.stringify(record(template)?.headers) === encoded)
    ? templates
    : [...templates, catalog];
}

function declaredAuthentication(input: IntegrationSetupInput): unknown[] | undefined {
  const method = input.authentication;
  if (!method) return undefined;
  if (method.kind === "none") return [];
  if (method.kind === "oauth2") return [{ kind: "oauth2" }];
  const name = method.name?.trim();
  if (!name) throw new Error("Enter the API key header or query parameter name.");
  const value: AuthTemplateValue = [...(method.prefix ? [method.prefix] : []), variable("token")];
  return [
    {
      type: "apiKey",
      label: method.carrier === "query" ? "API key query parameter" : method.prefix ? "Bearer token" : "API key header",
      ...(method.carrier === "query" ? { queryParams: { [name]: value } } : { headers: { [name]: value } }),
    },
  ];
}

function mcpAuthentication(input: IntegrationSetupInput, preview: McpProbe): unknown[] {
  const declared = declaredAuthentication(input);
  if (declared) return declared.length ? declared : [{ kind: "none" }];
  const methods: unknown[] = [];
  if (preview.requiresOAuth || ["oauth", "oauth2"].includes(input.catalog?.auth?.kind ?? "")) {
    methods.push({ kind: "oauth2" });
  }
  if (preview.requiresAuthentication && !preview.requiresOAuth && !input.catalog?.auth?.header) {
    methods.push({
      type: "apiKey",
      label: "Bearer token",
      headers: { Authorization: ["Bearer ", variable("token")] },
    });
  }
  const withCatalog = appendCatalogTemplate(methods, input);
  return withCatalog.length ? withCatalog : [{ kind: "none" }];
}

function resolveMetadataUrl(value: string | undefined, baseUrl: string): string {
  if (!value) return "";
  try {
    return new URL(value).toString();
  } catch {
    try {
      return new URL(value, baseUrl).toString();
    } catch {
      return value;
    }
  }
}

function variablesForAuthNames(names: readonly string[]): ReadonlyMap<string, string> {
  const variables = new Map<string, string>();
  if (names.length <= 1) return variables;
  const taken = new Set<string>();
  for (const name of names) {
    const base = slugifyIntegrationName(name) || "input";
    let candidate = base;
    for (let suffix = 2; taken.has(candidate); suffix += 1) candidate = `${base}_${suffix}`;
    taken.add(candidate);
    variables.set(name, candidate);
  }
  return variables;
}

function openApiBaseUrl(preview: OpenApiPreview): string | undefined {
  const server = preview.servers[0];
  if (!server) return undefined;
  let resolved = server.url;
  for (const [name, details] of Object.entries(server.variables ?? {})) {
    if (typeof details?.default === "string") resolved = resolved.replaceAll(`{${name}}`, details.default);
  }
  return /\{[^}]+\}/.test(resolved) ? undefined : resolved;
}

function openApiAuthentication(input: IntegrationSetupInput, preview: OpenApiPreview): unknown[] | undefined {
  const declared = declaredAuthentication(input);
  if (declared) return declared;
  const catalogAuthKind = input.catalog?.auth?.kind ?? "";
  if (
    ["api-key", "apikey", "oauth", "oauth2"].includes(catalogAuthKind) &&
    !input.catalog?.auth?.header &&
    preview.headerPresets.length + preview.oauth2Presets.length === 0
  ) {
    throw new Error(
      "The catalog requires authentication, but the OpenAPI specification did not declare a supported authentication method. Use advanced setup in Executor.",
    );
  }
  const catalog = catalogHeaderTemplate(input);
  if (!catalog) return undefined;
  const methods: unknown[] = preview.headerPresets.map((preset, index) => {
    const headers: Record<string, AuthTemplateValue> = {};
    const names = [...preset.secretHeaders, ...(preset.secretQueryParams ?? [])];
    const variables = variablesForAuthNames(names);
    for (const name of preset.secretHeaders) {
      const distinct = variables.get(name) ?? "token";
      const label = preset.label.toLowerCase();
      const prefix =
        name.toLowerCase() === "authorization" && label.includes("bearer")
          ? "Bearer "
          : name.toLowerCase() === "authorization" && label.includes("basic")
            ? "Basic "
            : "";
      headers[name] = [...(prefix ? [prefix] : []), variable(distinct)];
    }
    const queryParams = Object.fromEntries(
      (preset.secretQueryParams ?? []).map((name) => [name, [variable(variables.get(name) ?? "token")]]),
    );
    return {
      type: "apiKey",
      slug: `apikey-${index}`,
      label: preset.label,
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(Object.keys(queryParams).length ? { queryParams } : {}),
    };
  });
  const baseUrl = openApiBaseUrl(preview);
  const needsBaseUrl = preview.oauth2Presets.some((preset) =>
    [preset.authorizationUrl, preset.tokenUrl].some((value) => value && !/^https?:\/\//i.test(value)),
  );
  if (needsBaseUrl && !baseUrl) {
    throw new Error(
      "Relative OAuth endpoints need an OpenAPI server URL whose template variables have defaults. Use advanced setup in Executor.",
    );
  }
  methods.push(
    ...preview.oauth2Presets.map((preset) => ({
      slug: `oauth-${preset.securitySchemeName}`,
      kind: "oauth2",
      label: preset.label,
      authorizationUrl: resolveMetadataUrl(preset.authorizationUrl, baseUrl ?? ""),
      tokenUrl: resolveMetadataUrl(preset.tokenUrl, baseUrl ?? ""),
      scopes: Object.keys(preset.scopes),
      ...(preset.resource ? { resource: preset.resource } : {}),
      ...(preset.supportsClientIdMetadataDocument ? { supportsClientIdMetadataDocument: true } : {}),
    })),
  );
  return appendCatalogTemplate(methods, input);
}

function graphqlAuthentication(input: IntegrationSetupInput): unknown[] | undefined {
  const declared = declaredAuthentication(input);
  if (declared) return declared;
  const method = catalogHeaderTemplate(input);
  if (method) return [method];
  return undefined;
}

function assertFreshPreview(input: IntegrationSetupInput, preview: IntegrationSetupPreview): void {
  if (preview.kind !== input.kind || preview.fingerprint !== fingerprint(input)) {
    throw new Error("Setup changed after validation. Validate it again before adding the integration.");
  }
}

async function assertAvailableSlug(slug: string): Promise<void> {
  const integrations = await listIntegrations();
  if (integrations.some((integration) => integration.slug === slug)) {
    throw new Error(`The namespace "${slug}" already exists. Choose another namespace.`);
  }
}

async function verifyCreated(slug: string, kind: CatalogKind): Promise<void> {
  const integrations = await listIntegrations();
  const created = integrations.find((integration) => integration.slug === slug);
  if (!created || created.kind !== kind) {
    throw new Error(
      "Executor may have added the integration but did not verify it. Check Browse Integrations before trying again.",
    );
  }
}

export async function createIntegration(
  input: IntegrationSetupInput,
  preview: IntegrationSetupPreview,
): Promise<IntegrationCreationResult> {
  const exact = normalizeIntegrationSetupInput(input);
  assertFreshPreview(exact, preview);
  await assertAvailableSlug(exact.slug);

  let response: unknown;
  if (exact.kind === "mcp" && preview.kind === "mcp") {
    response = await request<unknown>("/api/mcp/servers", {
      method: "POST",
      body: JSON.stringify({
        transport: "remote",
        name: exact.name,
        slug: exact.slug,
        description: exact.description ?? exact.name,
        endpoint: exact.endpoint,
        authenticationTemplate: mcpAuthentication(exact, preview.result),
        ...(preview.result.versionNegotiation === "legacy" ? { versionNegotiation: "legacy" } : {}),
      }),
    });
  } else if (exact.kind === "openapi" && preview.kind === "openapi") {
    const authenticationTemplate = openApiAuthentication(exact, preview.result);
    response = await request<unknown>("/api/openapi/specs", {
      method: "POST",
      body: JSON.stringify({
        spec: /^https?:\/\//i.test(exact.endpoint)
          ? { kind: "url", url: exact.endpoint }
          : { kind: "blob", value: exact.endpoint },
        slug: exact.slug,
        name: exact.name,
        ...(exact.description ? { description: exact.description } : {}),
        ...(exact.catalog?.domain ? { displayDomain: exact.catalog.domain } : {}),
        ...(exact.catalog?.specOverrides?.length ? { specOverrides: exact.catalog.specOverrides } : {}),
        ...(authenticationTemplate ? { authenticationTemplate } : {}),
      }),
    });
  } else if (exact.kind === "graphql" && preview.kind === "graphql") {
    response = await request<unknown>("/api/graphql/integrations", {
      method: "POST",
      body: JSON.stringify({
        endpoint: exact.endpoint,
        slug: exact.slug,
        name: exact.name,
        ...(exact.description ? { description: exact.description } : {}),
        ...(graphqlAuthentication(exact) ? { authenticationTemplate: graphqlAuthentication(exact) } : {}),
      }),
    });
  }

  const row = record(response);
  if (!row || row.slug !== exact.slug) {
    throw new Error(
      "Executor may have added the integration but returned an unexpected response. Check Browse Integrations before trying again.",
    );
  }
  try {
    await verifyCreated(exact.slug, exact.kind);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Executor may have added")) throw error;
    throw new Error(
      "Executor may have added the integration but verification failed. Check Browse Integrations before trying again.",
    );
  }
  return {
    slug: exact.slug,
    name: typeof row.name === "string" ? row.name : exact.name,
    kind: exact.kind,
    ...(typeof row.toolCount === "number" ? { toolCount: row.toolCount } : {}),
  };
}

export function advancedSetupReason(input: IntegrationSetupInput): string | undefined {
  const value = input.endpoint.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (!input.catalog?.domain && (parsed.search || parsed.hash)) {
        return "Endpoint query parameters and fragments need advanced setup in Executor so secrets are not kept in this form.";
      }
    } catch {
      return undefined;
    }
  }
  if (input.authentication) return undefined;
  try {
    catalogHeaderTemplate(input);
  } catch (error) {
    return error instanceof Error ? error.message : "This setup needs advanced configuration in Executor.";
  }
  const kind = input.catalog?.auth?.kind;
  if (input.kind === "graphql" && ["oauth", "oauth2"].includes(kind ?? "")) {
    return "Catalog OAuth for GraphQL needs advanced setup in Executor.";
  }
  if (input.kind !== "openapi" && ["api-key", "apikey"].includes(kind ?? "") && !input.catalog?.auth?.header) {
    return "The catalog API key method has no supported header placement and needs advanced setup in Executor.";
  }
  if (kind && !["none", "oauth", "oauth2", "api-key", "apikey"].includes(kind) && !input.catalog?.auth?.header) {
    return `The catalog declares ${kind} authentication, which needs advanced setup in Executor.`;
  }
  return undefined;
}
