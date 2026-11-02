import { normalizeBase32Secret, normalizeNewAccountInput } from "../account-validation";
import type { NewAccountInput, VaultGroup } from "../types";

// ---- Algorithm normalization ----

export const ALGORITHM_MAP: Record<string, "SHA-1" | "SHA-256" | "SHA-512"> = {
  SHA1: "SHA-1",
  "SHA-1": "SHA-1",
  "sha-1": "SHA-1",
  sha1: "SHA-1",
  SHA256: "SHA-256",
  "SHA-256": "SHA-256",
  sha256: "SHA-256",
  "sha-256": "SHA-256",
  SHA512: "SHA-512",
  "SHA-512": "SHA-512",
  sha512: "SHA-512",
  "sha-512": "SHA-512",
};

export function normalizeAlgorithm(alg: string | undefined | null): "SHA-1" | "SHA-256" | "SHA-512" {
  if (!alg) return "SHA-1";
  return ALGORITHM_MAP[alg.trim()] ?? "SHA-1";
}

export function normalizeType(t: string | undefined | null): "totp" | "hotp" {
  if (!t) return "totp";
  return t.toLowerCase() === "hotp" ? "hotp" : "totp";
}

// ---- Base32 detection ----

export function isBase32Secret(text: string): boolean {
  return normalizeBase32Secret(text) !== null;
}

export function normalizeGroups(value: unknown): VaultGroup[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const groups: VaultGroup[] = [];
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    groups.push({
      id,
      name: name.slice(0, 20),
      order: Number.isFinite(raw.order) ? Number(raw.order) : index,
      createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : Date.now() + index,
    });
  }
  return groups;
}

export function normalizeAccounts(values: unknown): NewAccountInput[] {
  if (!Array.isArray(values)) return [];
  return values
    .map(normalizeNewAccountInput)
    .filter((account): account is NewAccountInput => account !== null);
}
