import createOpenApiFetch, { type Client, type Middleware } from "openapi-fetch";
import type { paths } from "./generated/types.js";
import { authHeaderValue, type Auth } from "./auth.js";
import { ApiError } from "./errors.js";

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
        baseUrl: opts.baseUrl.replace(/\/$/, ""),
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
            const cloned = response.clone();
            let body: unknown = null;
            try {
                body = await cloned.json();
            } catch {
                try {
                    body = await cloned.text();
                } catch {
                    body = null;
                }
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
