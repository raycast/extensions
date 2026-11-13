import { readFileSync } from "node:fs";
import type { ConnectionOptions } from "node:tls";
import type { Client } from "ldapts";

export interface LdapTlsPreferences {
  ldapSecurity: "starttls" | "ldaps" | "none";
  ldapTLSVerify?: boolean;
  ldapCACert?: string;
}

export const STARTTLS_HANDSHAKE_TIMEOUT_MS = 10_000;

export function formatTargetHost(host: string): string {
  const trimmed = host.trim();
  if (trimmed.includes(":") && !trimmed.startsWith("[")) {
    return `[${trimmed}]`;
  }
  return trimmed;
}

export function connectionHost(host: string): string {
  return host.trim().replace(/^\[/, "").replace(/\]$/, "");
}

export function tlsOptions(
  preferences: LdapTlsPreferences,
  host: string,
): ConnectionOptions | undefined {
  if (preferences.ldapSecurity === "none") {
    return undefined;
  }
  const options: ConnectionOptions = {
    rejectUnauthorized: preferences.ldapTLSVerify !== false,
    host,
  };
  if (preferences.ldapCACert) {
    try {
      options.ca = readFileSync(preferences.ldapCACert);
    } catch {
      throw new Error(
        `Unable to read TLS CA certificate file: ${preferences.ldapCACert}`,
      );
    }
  }
  return options;
}

/**
 * ldapts starts the TLS upgrade with no handshake timeout of its own: a server
 * that acknowledges StartTLS and then stops responding leaves the await pending
 * forever, and the client's connect/request timeouts do not cover this phase.
 * Race the handshake against a deadline and tear the connection down on expiry.
 */
export async function startTLSWithDeadline(
  client: Client,
  options: ConnectionOptions | undefined,
  timeoutMs: number = STARTTLS_HANDSHAKE_TIMEOUT_MS,
): Promise<void> {
  const handshake = client.startTLS(options);
  // The race settles with the first failure; the loser's later rejection must
  // not surface as an unhandled rejection.
  handshake.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      handshake,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`StartTLS handshake timed out after ${timeoutMs} ms`),
            ),
          timeoutMs,
        );
      }),
    ]);
  } catch (error) {
    client.unbind().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
