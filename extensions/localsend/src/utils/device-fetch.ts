import { Agent, fetch as undiciFetch } from "undici";

// LocalSend devices serve HTTPS with a self-signed certificate generated on
// the device itself — the protocol has no certificate authority — so TLS
// certificate verification must be disabled for connections to devices.
const httpsDeviceDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

/**
 * fetch() wrapper for LocalSend device connections. Disables TLS certificate
 * verification for https:// URLs (LocalSend devices use self-signed
 * certificates by design); http:// URLs are passed through unchanged.
 */
export const deviceFetch = (url: string, init?: RequestInit): Promise<Response> =>
  undiciFetch(
    url,
    // undici bundles its own undici-types copy, so its RequestInit is not
    // identical to the global one; the values are structurally compatible.
    (url.startsWith("https:") ? { ...init, dispatcher: httpsDeviceDispatcher } : init) as Parameters<
      typeof undiciFetch
    >[1],
  ) as Promise<Response>;
