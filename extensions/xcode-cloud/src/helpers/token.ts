import { getPreferenceValues } from "@raycast/api";
import { readFileSync } from "fs";
import { sign } from "jsonwebtoken";

export function generate() {
  const preferences = getPreferenceValues();

  const issuerId = preferences.issuerId;
  const keyId = preferences.keyId;
  const privateKey = readFileSync(preferences.privateKey);

  const now = Math.round(new Date().getTime() / 1000);
  const expire = now + 1199;

  const token = sign(
    {
      iss: issuerId,
      iat: now,
      exp: expire,
      aud: "appstoreconnect-v1",
    },
    privateKey,
    {
      algorithm: "ES256",
      header: { alg: "ES256", kid: keyId, typ: "JWT" },
    }
  );

  return token;
}
