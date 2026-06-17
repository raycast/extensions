import { createClient, type Auth, type SaasflowClient } from "@saasflow/api-client";
import { getAuth } from "./auth.js";
import { preferences } from "./preferences.js";

let cached: { client: SaasflowClient; baseUrl: string; authFingerprint: string } | null = null;

function authFingerprint(auth: Auth): string {
    switch (auth.kind) {
        case "apiKey":
            return `apiKey:${auth.key}`;
        case "oauthBearer":
            return `oauthBearer:${auth.token}`;
        case "firebaseIdToken":
            return `firebaseIdToken:${auth.token}`;
        default: {
            const _exhaustive: never = auth;
            return _exhaustive;
        }
    }
}

/**
 * Lazy singleton: building the client costs an OAuth exchange on first call
 * (or zero round-trips when an API key is configured). Reset the cache when
 * the base URL or auth credentials change between calls so toggling the API-key
 * preference or refreshing an OAuth token doesn't keep using a stale client.
 */
export async function getClient(): Promise<SaasflowClient> {
    const { apiBaseUrl } = preferences();
    const auth = await getAuth();
    const fingerprint = authFingerprint(auth);
    if (cached && cached.baseUrl === apiBaseUrl && cached.authFingerprint === fingerprint) {
        return cached.client;
    }
    const client = createClient({ baseUrl: apiBaseUrl, auth });
    cached = { client, baseUrl: apiBaseUrl, authFingerprint: fingerprint };
    return client;
}
