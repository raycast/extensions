// Agent- and developer-facing discovery documents. One builder for every
// host that serves them (API origin, docs site; www proxies the API copies)
// so the MCP server card and RFC 9727 catalog cannot drift.
//
//   GET /                               → JSON index (API origin only)
//   GET /.well-known/mcp                → MCP server card
//       /.well-known/mcp/server-card.json
//   GET /.well-known/api-catalog        → RFC 9727 API catalog (linkset)
//   GET <mcp-url>/server-card           → SEP-2127 MCP Server Card (v1)
//   GET /.well-known/ai-catalog.json    → AI Catalog pointing at that card

export const SITE_URL = 'https://saasflow.com';
export const PUBLIC_API_URL = 'https://api.saasflow.com';
export const PUBLIC_DOCS_URL = 'https://docs.saasflow.com';
export const SUPPORT_EMAIL = 'support@saasflow.com';

/** Media type for an RFC 9727 API catalog. */
export const API_CATALOG_CONTENT_TYPE =
    'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"; charset=utf-8';

/** Media type for an OpenAPI 3.1 document. */
export const OPENAPI_CONTENT_TYPE = 'application/vnd.oai.openapi+json;version=3.1; charset=utf-8';

/** Media type for an MCP server card. */
export const MCP_SERVER_CARD_TYPE = 'application/mcp-server-card+json';
export const SERVER_CARD_CONTENT_TYPE = `${MCP_SERVER_CARD_TYPE}; charset=utf-8`;

/** Media type for an AI Catalog (SEP-2127 domain-level discovery). */
export const AI_CATALOG_CONTENT_TYPE = 'application/ai-catalog+json; charset=utf-8';

/**
 * The MCP server's `serverInfo.version`. The Server Card repeats it, and
 * SEP-2127 wants the two to agree, so both read it from here.
 */
export const MCP_SERVER_VERSION = '0.1.0';

export interface DiscoveryUrls {
    /** Public origin of the API, e.g. https://api.saasflow.com */
    apiUrl: string;
    /** Public URL of the MCP endpoint. Defaults to `{apiUrl}/mcp`. */
    mcpUrl?: string;
    /** Docs site origin. Defaults to the public docs host. */
    docsUrl?: string;
}

const resolved = ({ apiUrl, mcpUrl, docsUrl = PUBLIC_DOCS_URL }: DiscoveryUrls) => ({
    apiUrl: apiUrl.replace(/\/$/, ''),
    mcpUrl: (mcpUrl ?? `${apiUrl.replace(/\/$/, '')}/mcp`).replace(/\/$/, ''),
    docsUrl: docsUrl.replace(/\/$/, ''),
});

/**
 * MCP server card: the static, unauthenticated description a client or
 * registry reads before connecting. Same shape as the MCP Registry
 * `server.json`, which is what the emerging `/.well-known/mcp` discovery
 * proposals serve. Remotes only — there is no installable package.
 */
export function buildMcpServerCard(urls: DiscoveryUrls) {
    const { mcpUrl, docsUrl } = resolved(urls);
    return {
        $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
        name: 'com.saasflow/mcp',
        title: 'SaaSFlow',
        description:
            'Read and analyse SaaSFlow financial data for SaaS companies: bank accounts and transactions, customers and vendors, subscriptions and MRR, cash flow, P&L, forecasts and planned transactions. Writes are opt-in.',
        version: '1.0.0',
        websiteUrl: SITE_URL,
        remotes: [
            {
                type: 'streamable-http',
                url: mcpUrl,
                // Bearer auth: OAuth 2.1 (dynamic registration, PKCE) or a
                // SaaSFlow API key. Discovery per RFC 9728 at
                // /.well-known/oauth-protected-resource/mcp.
                headers: [
                    {
                        name: 'Authorization',
                        description:
                            'Bearer token: an OAuth 2.1 access token (scopes saasflow:read, saasflow:write) or a SaaSFlow API key (sf_…).',
                        isRequired: true,
                        isSecret: true,
                    },
                ],
            },
        ],
        // No `packages`: SaaSFlow ships one MCP server, the hosted one. A
        // client that can't reach it over HTTP has nothing to install.
        _meta: {
            'com.saasflow/docs': `${docsUrl}/developers/mcp/overview`,
        },
    };
}

/**
 * RFC 9727 API catalog: a linkset pointing at the live OpenAPI description
 * and the human docs for the API root. `service-desc` is always the API
 * origin's `/openapi.json`, not a host-local mirror.
 */
export function buildApiCatalog(urls: DiscoveryUrls) {
    const { apiUrl, docsUrl } = resolved(urls);
    return {
        linkset: [
            {
                anchor: `${apiUrl}/`,
                'service-desc': [
                    { href: `${apiUrl}/openapi.json`, type: 'application/vnd.oai.openapi+json' },
                ],
                'service-doc': [{ href: `${docsUrl}/developers/api/overview`, type: 'text/html' }],
                'service-meta': [
                    {
                        href: `${apiUrl}/.well-known/oauth-authorization-server`,
                        type: 'application/json',
                    },
                ],
            },
        ],
    };
}

/**
 * `GET /` on the API origin. Unauthenticated, so a crawler or an agent that
 * lands on the bare host gets a map instead of a 401.
 */
export function buildApiIndex(urls: DiscoveryUrls) {
    const { apiUrl, mcpUrl, docsUrl } = resolved(urls);
    return {
        name: 'SaaSFlow Public API',
        description:
            'REST API for SaaSFlow, the finance cockpit for SaaS companies. All data routes live under /companies/{companyId}/… and require a bearer token (SaaSFlow API key or OAuth 2.1 access token).',
        documentation: `${docsUrl}/developers`,
        openapi: `${apiUrl}/openapi.json`,
        api_catalog: `${apiUrl}/.well-known/api-catalog`,
        authentication: {
            api_keys: `${docsUrl}/developers/api/api-keys`,
            oauth: `${docsUrl}/developers/oauth-for-apps`,
            oauth_authorization_server: `${apiUrl}/.well-known/oauth-authorization-server`,
        },
        mcp: {
            endpoint: mcpUrl,
            server_card: `${apiUrl}/.well-known/mcp`,
            documentation: `${docsUrl}/developers/mcp/overview`,
        },
        llms_txt: `${docsUrl}/llms.txt`,
        website: SITE_URL,
        support: SUPPORT_EMAIL,
    };
}

/** Body for a 404 on the API origin: the error plus where to look instead. */
export function buildNotFoundBody(urls: DiscoveryUrls) {
    const { apiUrl, docsUrl } = resolved(urls);
    return {
        error: 'Not found',
        hint: 'No such route. The OpenAPI document lists every available operation.',
        openapi: `${apiUrl}/openapi.json`,
        documentation: `${docsUrl}/developers`,
    };
}

/** Markdown representation of an API 404 for text-oriented agents. */
export function buildNotFoundMarkdown(urls: DiscoveryUrls): string {
    const { apiUrl, docsUrl } = resolved(urls);
    return [
        '# API route not found',
        '',
        'No API operation exists at this URL.',
        '',
        `- [OpenAPI document](${apiUrl}/openapi.json)`,
        `- [API documentation](${docsUrl}/developers)`,
        `- [API catalog](${apiUrl}/.well-known/api-catalog)`,
        '',
    ].join('\n');
}
/**
 * SEP-2127 MCP Server Card (schema v1), served at `<mcp-url>/server-card`
 * for each MCP address. Unlike the registry-shaped card at
 * `/.well-known/mcp`, it carries only what a client needs before
 * connecting. The description is capped at 100 characters by the schema.
 */
export function buildServerCard(urls: DiscoveryUrls) {
    const { mcpUrl, docsUrl } = resolved(urls);
    return {
        $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
        name: 'com.saasflow/mcp',
        version: MCP_SERVER_VERSION,
        title: 'SaaSFlow',
        description:
            'Financial data of SaaS companies: cash, transactions, MRR, P&L and forecasts.',
        websiteUrl: `${docsUrl}/developers/mcp/overview`,
        icons: [{ src: `${SITE_URL}/logo192.png`, mimeType: 'image/png', sizes: ['192x192'] }],
        remotes: [
            {
                type: 'streamable-http',
                url: mcpUrl,
                // OAuth clients need no header: they find the authorization
                // server through the 401 and RFC 9728 metadata. Only API-key
                // users fill this in, so it is optional.
                headers: [
                    {
                        name: 'Authorization',
                        description:
                            'Optional. A SaaSFlow API key for scripts. Leave empty to sign in with OAuth.',
                        isRequired: false,
                        isSecret: true,
                        value: 'Bearer {api_key}',
                        variables: {
                            api_key: {
                                description: 'SaaSFlow API key (sf_live_…)',
                                isSecret: true,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/**
 * AI Catalog for domain-level discovery (`/.well-known/ai-catalog.json`):
 * one entry, pointing at the Server Card of the canonical MCP address.
 */
export function buildAiCatalog({
    serverCardUrl,
    docsUrl = PUBLIC_DOCS_URL,
}: {
    serverCardUrl: string;
    docsUrl?: string;
}) {
    return {
        specVersion: '1.0',
        host: {
            displayName: 'SaaSFlow',
            identifier: 'saasflow.com',
            documentationUrl: `${docsUrl.replace(/\/$/, '')}/developers`,
            logoUrl: `${SITE_URL}/logo192.png`,
        },
        entries: [
            {
                identifier: 'urn:air:saasflow.com:mcp:saasflow',
                type: MCP_SERVER_CARD_TYPE,
                url: serverCardUrl,
            },
        ],
    };
}