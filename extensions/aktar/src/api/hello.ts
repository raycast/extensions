import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Before the token goes to the port, the app there proves it has the same
// token: GET /v1/hello?nonce=<random> answers with an HMAC of the nonce,
// keyed with the token, which only Aktar can make (Aktar for Mac 0.18.0 /
// Windows 0.11.0). Same scheme as the Aktar CLI.

const HELLO_PREFIX = "aktar-hello-v1:";

export const OUTDATED_APP_MESSAGE =
  "This version of Aktar can't prove it's Aktar before the token is sent, so the token wasn't sent. Update to Aktar for Mac 0.18.0 or Aktar for Windows 0.11.0 or later.";

export function unverifiedMessage(port: number) {
  return `The app on port ${port} couldn't prove it's Aktar, so the token wasn't sent. If Aktar is running, its token may have changed: connect again with Connect to Aktar.`;
}

/** 32 random bytes, base64url: 43 characters of [A-Za-z0-9_-]. */
export function helloNonce() {
  return randomBytes(32).toString("base64url");
}

/** Whether `reply` from /v1/hello proves the app has `token`. */
export function isValidHello(reply: unknown, token: string, nonce: string) {
  const { app, proof } = (reply ?? {}) as { app?: unknown; proof?: unknown };
  if (app !== "Aktar" || typeof proof !== "string" || !/^[0-9a-f]{64}$/.test(proof)) return false;
  const expected = createHmac("sha256", token).update(`${HELLO_PREFIX}${nonce}`, "utf8").digest();
  return timingSafeEqual(Buffer.from(proof, "hex"), expected);
}
