import { randomBytes, createHash } from "crypto";

export interface PKCEPair {
  verifier: string;
  challenge: string;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePKCE(): PKCEPair {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(
    createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge };
}

export const PAIR_CALLBACK_URL =
  "raycast://extensions/ngoquocdat/tablepro/pair-callback";

export const STORAGE_KEYS = {
  apiToken: "apiToken",
  pendingVerifier: "pairing.pendingVerifier",
};
