import { createClient, type SaasflowClient } from '@saasflow/api-client';
import { getAuth } from './auth.js';
import { preferences } from './preferences.js';

let cached: { client: SaasflowClient; baseUrl: string; authKind: string } | null = null;

/**
 * Lazy singleton: building the client costs an OAuth exchange on first call
 * (or zero round-trips when an API key is configured). Reset the cache when
 * the base URL or auth source changes between calls so toggling the API-key
 * preference doesn't keep using a stale OAuth client.
 */
export async function getClient(): Promise<SaasflowClient> {
    const { apiBaseUrl } = preferences();
    const auth = await getAuth();
    if (cached && cached.baseUrl === apiBaseUrl && cached.authKind === auth.kind) {
        return cached.client;
    }
    const client = createClient({ baseUrl: apiBaseUrl, auth });
    cached = { client, baseUrl: apiBaseUrl, authKind: auth.kind };
    return client;
}
