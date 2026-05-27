import { createHash } from "node:crypto";

export type HashAlgorithmLabel =
  | "MD5"
  | "SHA-1"
  | "SHA-256"
  | "SHA-384"
  | "SHA-512";

export type HashResult = {
  algorithm: HashAlgorithmLabel;
  value: string;
};

const hashAlgorithms: Array<{ label: HashAlgorithmLabel; nodeName: string }> = [
  { label: "MD5", nodeName: "md5" },
  { label: "SHA-1", nodeName: "sha1" },
  { label: "SHA-256", nodeName: "sha256" },
  { label: "SHA-384", nodeName: "sha384" },
  { label: "SHA-512", nodeName: "sha512" },
];

export function generateHashes(input: string): HashResult[] {
  return hashAlgorithms.map(({ label, nodeName }) => ({
    algorithm: label,
    value: createHash(nodeName).update(input, "utf8").digest("hex"),
  }));
}

export function formatHashesForClipboard(hashes: HashResult[]): string {
  return hashes
    .map(({ algorithm, value }) => `${algorithm}: ${value}`)
    .join("\n");
}
