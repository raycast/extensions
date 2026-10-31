import { environment } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generate } from "selfsigned";
import { Agent } from "undici";

const CLIENT_CERT_VALIDITY_YEARS = 10;

/**
 * LocalSend receivers with encryption enabled request a client certificate
 * during the TLS handshake (mutual TLS) and abort it when none is sent. Any
 * self-signed certificate is accepted, so generate one once and reuse it.
 */
async function getClientCertificate(): Promise<{ cert: Buffer; key: Buffer }> {
  const directory = join(environment.supportPath, "tls");
  const certPath = join(directory, "client-cert.pem");
  const keyPath = join(directory, "client-key.pem");

  if (!existsSync(certPath) || !existsSync(keyPath)) {
    const notAfterDate = new Date();
    notAfterDate.setFullYear(notAfterDate.getFullYear() + CLIENT_CERT_VALIDITY_YEARS);
    const pems = await generate([{ name: "commonName", value: "LocalSend User" }], {
      keySize: 2048,
      algorithm: "sha256",
      notAfterDate,
    });
    mkdirSync(directory, { recursive: true });
    writeFileSync(keyPath, pems.private, { mode: 0o600 });
    writeFileSync(certPath, pems.cert);
  }

  return { cert: readFileSync(certPath), key: readFileSync(keyPath) };
}

let httpsDeviceDispatcher: Promise<Agent> | undefined;

// LocalSend devices serve HTTPS with a self-signed certificate generated on
// the device itself — the protocol has no certificate authority — so TLS
// certificate verification must be disabled for connections to devices.
function getHttpsDeviceDispatcher(): Promise<Agent> {
  if (!httpsDeviceDispatcher) {
    httpsDeviceDispatcher = getClientCertificate()
      .then(({ cert, key }) => new Agent({ connect: { rejectUnauthorized: false, cert, key } }))
      .catch((error) => {
        console.error("Failed to create a LocalSend client certificate:", error);
        // Try again on the next request, and still reach receivers that don't require one.
        httpsDeviceDispatcher = undefined;
        return new Agent({ connect: { rejectUnauthorized: false } });
      });
  }
  return httpsDeviceDispatcher;
}

/**
 * fetch() wrapper for LocalSend device connections. Disables TLS certificate
 * verification for https:// URLs (LocalSend devices use self-signed
 * certificates by design) and presents a client certificate for receivers
 * that require one; http:// URLs are passed through unchanged.
 */
export const deviceFetch = async (url: string, init?: RequestInit): Promise<Response> => {
  if (!url.startsWith("https:")) {
    return fetch(url, init);
  }
  return fetch(url, { ...init, dispatcher: await getHttpsDeviceDispatcher() } as RequestInit);
};
