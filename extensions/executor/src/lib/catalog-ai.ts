import type { ConfirmationDetails } from "./ai-tools";
import { launchCommand, LaunchType } from "@raycast/api";
import { currentWorkspace } from "./workspaces";
import {
  CATALOG_KINDS,
  endpointUrl,
  isUrlInput,
  lookupCatalogItem,
  resolveCatalogItem,
  searchCatalog,
  type CatalogItem,
  type CatalogKind,
} from "./catalog";

export interface SearchCatalogInput {
  /** Service name or keywords. Endpoint URLs are rejected from public search. */
  query: string;
  /** Optional integration type filter. */
  kind?: CatalogKind;
  /** Zero-based page. Each page contains at most 40 results. */
  page?: number;
}

export interface PrepareCatalogSetupInput {
  /** MCP, OpenAPI, or GraphQL. */
  kind: CatalogKind;
  /** Exact catalog domain returned by search-integration-catalog. Omit for a custom setup. */
  domain?: string;
  /** Exact optional catalog slug returned by search-integration-catalog. */
  slug?: string;
  /** Custom HTTPS or local HTTP endpoint. Omit to configure from scratch. Never include credentials. */
  endpoint?: string;
}

function kind(value: CatalogKind): CatalogKind {
  if (!CATALOG_KINDS.includes(value)) throw new Error("Integration type must be mcp, openapi, or graphql.");
  return value;
}

function page(value = 0): number {
  if (!Number.isInteger(value) || value < 0 || value > 250) throw new Error("Page must be an integer from 0 to 250.");
  return value;
}

function credentialFreeEndpoint(value: string): string | undefined {
  const endpoint = endpointUrl(value);
  if (!endpoint) return undefined;
  const url = new URL(endpoint);
  const sensitiveNames = new Set([
    "apikey",
    "key",
    "token",
    "accesstoken",
    "refreshtoken",
    "auth",
    "authorization",
    "bearer",
    "credential",
    "credentials",
    "password",
    "passwd",
    "secret",
    "clientsecret",
    "signature",
    "sig",
    "jwt",
  ]);
  const hasCredentialLikeQuery = [...url.searchParams.keys()].some((key) =>
    sensitiveNames.has(key.toLowerCase().replace(/[-_.]/g, "")),
  );
  if (hasCredentialLikeQuery) return undefined;
  return endpoint;
}

export async function searchIntegrationCatalog(input: SearchCatalogInput) {
  const query = input.query.trim();
  if (!query) throw new Error("Search query is required.");
  if (isUrlInput(query))
    throw new Error(
      "Use prepare-integration-setup for an endpoint URL. Public catalog search accepts service names only.",
    );
  const pageNumber = page(input.page);
  const result = await searchCatalog(query, input.kind === undefined ? undefined : kind(input.kind), pageNumber);
  return {
    query,
    page: pageNumber,
    hasMore: result.hasMore,
    nextPage: result.hasMore ? pageNumber + 1 : undefined,
    items: result.data.map(({ id, domain, title, description, kind, slug, url, auth }) => ({
      id,
      domain,
      title,
      description,
      kind,
      slug,
      url,
      authentication: auth?.kind,
    })),
  };
}

async function setupItem(input: PrepareCatalogSetupInput): Promise<Partial<CatalogItem>> {
  const setupKind = kind(input.kind);
  const domain = input.domain?.trim();
  const rawEndpoint = input.endpoint?.trim();
  if (domain && rawEndpoint) throw new Error("Choose a catalog item or a custom endpoint, not both.");
  if (input.slug?.trim() && !domain) throw new Error("A catalog slug requires its exact catalog domain.");

  if (domain) {
    if (/[:/\\?@#]/.test(domain))
      throw new Error("Use the exact catalog domain returned by search-integration-catalog.");
    const item = await lookupCatalogItem(domain, setupKind, input.slug?.trim() || undefined);
    return resolveCatalogItem(item);
  }

  const url = rawEndpoint ? credentialFreeEndpoint(rawEndpoint) : undefined;
  if (rawEndpoint && !url)
    throw new Error(
      "Enter an HTTPS endpoint or a local HTTP endpoint. Remove embedded URL credentials and common credential query parameters; enter credentials privately in Add Connection.",
    );
  return { kind: setupKind, url };
}

export async function prepareIntegrationSetupConfirmation(
  input: PrepareCatalogSetupInput,
): Promise<ConfirmationDetails> {
  const item = await setupItem(input);
  return {
    message: "Open native integration setup in Raycast? No integration is added until you submit the form.",
    info: [
      { name: "Type", value: kind(input.kind) },
      ...(input.domain ? [{ name: "Catalog Domain", value: input.domain.trim() }] : []),
      ...(item.url ? [{ name: "Endpoint", value: item.url }] : [{ name: "Endpoint", value: "Configure in Raycast" }]),
    ],
  };
}

export async function prepareIntegrationSetup(input: PrepareCatalogSetupInput) {
  await setupItem(input);
  const workspace = currentWorkspace();
  if (!workspace) throw new Error("Choose an Executor workspace before opening setup.");
  await launchCommand({
    name: "add-integration",
    type: LaunchType.UserInitiated,
    context: {
      workspaceId: workspace.id,
      integrationSetup: {
        kind: input.kind,
        domain: input.domain?.trim(),
        catalogSlug: input.slug?.trim(),
        endpoint: input.endpoint?.trim(),
      },
    },
  });
  return {
    status: "user_action_required",
    pending: true,
    instructions:
      "Complete Add Integration in Raycast, then call list-integrations to verify it was added. Enter any credentials privately, never in chat.",
  };
}
