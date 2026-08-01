import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import * as nip19 from "nostr-tools/nip19";
import { createHash, randomUUID } from "node:crypto";
import type { EventTemplate, NostrEvent } from "./types";

const HEX_64 = /^[0-9a-f]{64}$/i;

/**
 * Parse a Buzz/Nostr secret key from either an nsec1 bech32 string or a
 * 64-character hex string. Throws on any other input. The thrown error never
 * echoes the provided key material.
 */
export function parseSecretKey(input: string): Uint8Array {
  const trimmed = (input ?? "").trim();
  if (trimmed.startsWith("nsec1")) {
    let decoded;
    try {
      decoded = nip19.decode(trimmed);
    } catch {
      throw new Error("Invalid nsec key: could not decode the private key");
    }
    if (decoded.type !== "nsec") {
      throw new Error("Invalid key: expected an nsec private key");
    }
    return decoded.data as Uint8Array;
  }
  if (HEX_64.test(trimmed)) {
    return Uint8Array.from(Buffer.from(trimmed, "hex"));
  }
  throw new Error("Private key must be a 64-character hex string or an nsec1... key");
}

export function getPublicKeyHex(sk: Uint8Array): string {
  return getPublicKey(sk);
}

/**
 * Sign an event template with the given secret key, returning a complete Nostr
 * event (id, pubkey, sig filled in). All signing lives here so BuzzClient never
 * touches raw crypto.
 */
export function signEvent(template: EventTemplate, sk: Uint8Array): NostrEvent {
  return finalizeEvent(template, sk) as NostrEvent;
}

/**
 * Build a NIP-98 Authorization header value ("Nostr <base64>") for an HTTP
 * request. The base64 is UTF-8 safe (Buffer, not btoa) so non-ASCII bodies such
 * as emoji survive intact. The `u` tag is single-letter and must exactly match
 * the URL actually dialed; the relay does not alias localhost/127.0.0.1.
 */
export function buildNip98Header(url: string, method: string, body: string, sk: Uint8Array): string {
  const payloadHash = createHash("sha256").update(body, "utf8").digest("hex");
  const event = signEvent(
    {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["u", url],
        ["method", method],
        ["payload", payloadHash],
        ["nonce", randomUUID()],
      ],
      content: "",
    },
    sk,
  );
  const base64 = Buffer.from(JSON.stringify(event), "utf8").toString("base64");
  return `Nostr ${base64}`;
}
