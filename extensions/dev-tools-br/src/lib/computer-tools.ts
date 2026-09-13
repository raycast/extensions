import { createHash, randomUUID } from "node:crypto";

export function convertBase64(input: string, operation: string): string {
  return operation === "decode"
    ? Buffer.from(input, "base64").toString("utf8")
    : Buffer.from(input, "utf8").toString("base64");
}

export function convertBinary(input: string, operation: string): string {
  if (operation === "decode") {
    const bytes = input.trim().split(/\s+/);
    if (bytes.some((byte) => !/^[01]{8}$/.test(byte)))
      throw new Error("Separe bytes binários de 8 bits por espaço.");
    return Buffer.from(bytes.map((byte) => Number.parseInt(byte, 2))).toString("utf8");
  }
  return [...Buffer.from(input, "utf8")].map((byte) => byte.toString(2).padStart(8, "0")).join(" ");
}

export function convertUrl(input: string, operation: string): string {
  return operation === "decode" ? decodeURIComponent(input) : encodeURIComponent(input);
}

export function formatJson(input: string, minify: boolean): string {
  const parsed: unknown = JSON.parse(input);
  return JSON.stringify(parsed, null, minify ? 0 : 2);
}

export function hashText(input: string, algorithm: "md5" | "sha1" | "sha256" | "sha512"): string {
  return createHash(algorithm).update(input).digest("hex");
}

export function generateUuids(amount: number): string {
  return Array.from({ length: amount }, () => randomUUID()).join("\n");
}
