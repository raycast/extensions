import createOpenApiFetch, { type Client, type Middleware } from 'openapi-fetch';
import type { paths } from './generated/types.js';
import { authHeaderValue, type Auth } from './auth.js';
import { ApiError } from './errors.js';

export type SaasflowClient = Client<paths>;

export interface CreateClientOptions {
    baseUrl: string;
    auth: Auth;
    /**
     * Custom fetch implementation. Defaults to global fetch. Useful in tests
     * or to add tracing.
     */
    fetch?: typeof fetch;
    /** Extra headers added to every request. */
    headers?: Record<string, string>;
}

/**
 * Build a typed client for the SaaSFlow public API.
 *
 * Throws `ApiError` for non-2xx responses (with the parsed JSON body when
 * available). 2xx responses are returned as `{ data, response }` per the
 * openapi-fetch convention.
 */
export function createClient(opts: CreateClientOptions): SaasflowClient {
    const client = createOpenApiFetch<paths>({
        baseUrl: opts.baseUrl.replace(/\/$/, ''),
        fetch: opts.fetch ?? fetch,
        headers: {
            Authorization: authHeaderValue(opts.auth),
            ...opts.headers,
        },
    });

    const errorMiddleware: Middleware = {
        async onResponse({ response, request }) {
            if (response.ok) return;
            // Clone so the caller can still read .data; openapi-fetch will
            // surface the parsed body for 2xx, but for non-2xx we throw
            // before it ever resolves `.data`.
            //
            // Read as text first, then attempt JSON.parse. Calling
            // `.json()` then `.text()` on the same Response throws on the
            // second read because `.json()` consumes the body stream even
            // when JSON parsing fails, which would drop plain-text error
            // payloads (e.g. proxy 502s, nginx error pages).
            const cloned = response.clone();
            let body: unknown = null;
            try {
                const text = await cloned.text();
                if (text.length > 0) {
                    try {
                        body = JSON.parse(text);
                    } catch {
                        body = text;
                    }
                }
            } catch {
                body = null;
            }
            throw new ApiError({
                status: response.status,
                statusText: response.statusText,
                body,
                url: request.url,
                method: request.method,
            });
        },
    };

    client.use(errorMiddleware);
    return client;
}