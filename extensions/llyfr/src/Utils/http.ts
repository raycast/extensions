import { X509Certificate } from "node:crypto";
import tls from "node:tls";

import { Agent, fetch as undiciFetch, type RequestInfo, type RequestInit } from "undici";

/**
 * Trust anchors for HTTPS requests: only the self-signed roots from Node's default CA list.
 *
 * Raycast starts Node with `--use-system-ca`, which merges Node's bundled roots with the
 * Windows certificate store. The Windows store also contains cross-signed copies of some
 * roots, e.g. "USERTrust RSA Certification Authority" issued by "AAA Certificate Services".
 * OpenSSL may build the chain through such a copy, then fail with UNABLE_TO_GET_ISSUER_CERT
 * because its issuer isn't trusted (this breaks api.adsabs.harvard.edu). Keeping only
 * self-signed certificates removes that dead end without trusting anything new.
 *
 * Returns undefined on Node versions without `tls.getCACertificates`, which use the default.
 */
function selfSignedRoots(): string[] | undefined {
  if (typeof tls.getCACertificates !== "function") {
    return undefined;
  }
  return tls.getCACertificates("default").filter((pem) => {
    try {
      const cert = new X509Certificate(pem);
      return cert.subject === cert.issuer;
    } catch {
      return false;
    }
  });
}

let agent: Agent | undefined;

/** `fetch` that verifies HTTPS against self-signed roots only (see `selfSignedRoots`). */
export function httpFetch(input: RequestInfo, init: RequestInit = {}) {
  agent ??= new Agent({ connect: { ca: selfSignedRoots() } });
  return undiciFetch(input, { ...init, dispatcher: agent });
}
