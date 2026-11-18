import { describe, expect, it } from 'vitest';
import {
    buildAiCatalog,
    buildApiCatalog,
    buildApiIndex,
    buildMcpServerCard,
    buildNotFoundBody,
    buildNotFoundMarkdown,
    buildServerCard,
    MCP_SERVER_CARD_TYPE,
    MCP_SERVER_VERSION,
    PUBLIC_DOCS_URL,
} from './discovery.js';

const urls = { apiUrl: 'https://api.example.com', mcpUrl: 'https://api.example.com/mcp' };

describe('discovery documents', () => {
    it('builds an MCP server card with the remote endpoint and no installable package', () => {
        const card = buildMcpServerCard(urls);
        expect(card).toMatchObject({
            name: 'com.saasflow/mcp',
            description: expect.any(String),
            version: expect.any(String),
        });
        expect(card.remotes).toEqual([
            expect.objectContaining({
                type: 'streamable-http',
                url: 'https://api.example.com/mcp',
            }),
        ]);
        expect(card).not.toHaveProperty('packages');
        expect(card._meta['com.saasflow/docs']).toBe(`${PUBLIC_DOCS_URL}/developers/mcp/overview`);
    });

    it('defaults mcpUrl to {apiUrl}/mcp', () => {
        const card = buildMcpServerCard({ apiUrl: 'https://api.example.com/' });
        expect(card.remotes[0].url).toBe('https://api.example.com/mcp');
    });

    it('builds an RFC 9727 linkset anchored at the API root, pointing at the live spec', () => {
        const catalog = buildApiCatalog(urls);
        expect(catalog.linkset[0].anchor).toBe('https://api.example.com/');
        expect(catalog.linkset[0]['service-desc']).toEqual([
            {
                href: 'https://api.example.com/openapi.json',
                type: 'application/vnd.oai.openapi+json',
            },
        ]);
        expect(catalog.linkset[0]['service-doc'][0].href).toBe(
            `${PUBLIC_DOCS_URL}/developers/api/overview`,
        );
    });

    it('points the index and the 404 body at the spec and the docs', () => {
        const index = buildApiIndex(urls);
        expect(index.openapi).toBe('https://api.example.com/openapi.json');
        expect(index.mcp.endpoint).toBe('https://api.example.com/mcp');
        expect(index.mcp.server_card).toBe('https://api.example.com/.well-known/mcp');
        const notFound = buildNotFoundBody(urls);
        expect(notFound.error).toBe('Not found');
        expect(notFound.openapi).toBe('https://api.example.com/openapi.json');
        expect(buildNotFoundMarkdown(urls)).toContain(
            '[OpenAPI document](https://api.example.com/openapi.json)',
        );
    });

    // Checked against the official schema.json of
    // modelcontextprotocol/experimental-ext-server-card when this was written;
    // these are the constraints most likely to break on an edit.
    it('builds a SEP-2127 v1 Server Card for the given MCP address', () => {
        const card = buildServerCard({ ...urls, mcpUrl: 'https://mcp.example.com' });
        expect(card.$schema).toBe(
            'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
        );
        expect(card.name).toMatch(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
        expect(card.version).toBe(MCP_SERVER_VERSION);
        expect(card.description.length).toBeLessThanOrEqual(100);
        expect(card.title.length).toBeLessThanOrEqual(100);
        expect(card.remotes).toEqual([
            expect.objectContaining({ type: 'streamable-http', url: 'https://mcp.example.com' }),
        ]);
        // OAuth clients must not be told a header is required.
        expect(card.remotes[0].headers.every((header) => !header.isRequired)).toBe(true);
        expect(card).not.toHaveProperty('packages');
    });

    it('builds an AI Catalog with one entry pointing at the Server Card', () => {
        const catalog = buildAiCatalog({ serverCardUrl: 'https://mcp.example.com/server-card' });
        expect(catalog.specVersion).toBe('1.0');
        expect(catalog.host.displayName).toBe('SaaSFlow');
        expect(catalog.entries).toEqual([
            {
                identifier: 'urn:air:saasflow.com:mcp:saasflow',
                type: MCP_SERVER_CARD_TYPE,
                url: 'https://mcp.example.com/server-card',
            },
        ]);
    });
});