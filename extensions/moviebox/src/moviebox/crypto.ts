import crypto from "crypto";
import { SECRET_KEY_DEFAULT } from "./constants";

const md5 = (data: crypto.BinaryLike): string =>
  crypto.createHash("md5").update(data).digest("hex");

const decodeBase64 = (value: string): Buffer => {
  const padding = (4 - (value.length % 4)) % 4;
  return Buffer.from(value + "=".repeat(padding), "base64");
};

export function generateXClientToken(timestampMs: number): string {
  const timestampStr = timestampMs.toString();
  const reversed = timestampStr.split("").reverse().join("");
  return `${timestampStr},${md5(reversed)}`;
}

export function generateXTrSignature(
  method: string,
  accept: string,
  contentType: string,
  urlStr: string,
  body: string | null,
  timestampMs: number,
): string {
  const url = new URL(urlStr);
  const searchParams = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const canonicalUrl = searchParams
    ? `${url.pathname}?${searchParams}`
    : url.pathname;

  let bodyHash = "";
  let bodyLength = "";

  if (body) {
    const bodyBuffer = Buffer.from(body, "utf-8");
    const truncated = bodyBuffer.subarray(0, 102400); // 100KB max for hashing
    bodyHash = md5(truncated as unknown as crypto.BinaryLike);
    bodyLength = bodyBuffer.length.toString();
  }

  const payload = [
    method.toUpperCase(),
    accept,
    contentType,
    bodyLength,
    timestampMs,
    bodyHash,
    canonicalUrl,
  ].join("\n");

  const secret = decodeBase64(SECRET_KEY_DEFAULT);
  const signature = crypto
    .createHmac("md5", secret as unknown as crypto.BinaryLike)
    .update(payload, "utf-8")
    .digest("base64");

  return `${timestampMs}|2|${signature}`;
}
