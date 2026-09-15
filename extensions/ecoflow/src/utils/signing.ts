import crypto from "node:crypto";

type SignablePrimitive = string | number | boolean | null | undefined;
type SignableValue = SignablePrimitive | SignableObject | SignableValue[];

interface SignableObject {
  [key: string]: SignableValue;
}

export function flattenForSignature(value: SignableObject): Record<string, string> {
  const flattened: Record<string, string> = {};

  function visit(current: SignableValue, path: string): void {
    if (current === undefined) return;

    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }

    if (current !== null && typeof current === "object") {
      for (const [key, nestedValue] of Object.entries(current)) {
        visit(nestedValue, path ? `${path}.${key}` : key);
      }
      return;
    }

    flattened[path] = String(current);
  }

  visit(value, "");
  return flattened;
}

export function canonicalizeForSignature(
  params: Record<string, string>,
  accessKey: string,
  nonce: string,
  timestamp: string,
): string {
  const requestPart = Object.entries(params)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const authPart = `accessKey=${accessKey}&nonce=${nonce}&timestamp=${timestamp}`;
  return requestPart ? `${requestPart}&${authPart}` : authPart;
}

export function generateSignature(
  params: Record<string, string>,
  accessKey: string,
  secretKey: string,
  nonce: string,
  timestamp: string,
): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(canonicalizeForSignature(params, accessKey, nonce, timestamp))
    .digest("hex");
}

export function generateNonce(): string {
  return String(crypto.randomInt(100_000, 1_000_000));
}
