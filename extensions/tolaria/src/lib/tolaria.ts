import { readFileSync } from "fs";
import { homedir } from "os";
import { basename, join } from "path";

export const TOLARIA_APP_PATH = "/Applications/Tolaria.app";
const VAULTS_FILE = join(homedir(), "Library", "Application Support", "com.tolaria.app", "vaults.json");

export interface TolariaVault {
  label?: string | null;
  alias?: string | null;
  path: string;
  mounted?: boolean;
  available?: boolean | null;
}

export interface TolariaVaultsConfig {
  vaults: TolariaVault[];
  activeVault?: string;
}

export function readTolariaVaults(): TolariaVaultsConfig {
  try {
    const raw = JSON.parse(readFileSync(VAULTS_FILE, "utf8")) as {
      vaults?: TolariaVault[];
      active_vault?: string;
    };
    return {
      vaults: Array.isArray(raw.vaults) ? raw.vaults.filter((vault) => typeof vault?.path === "string") : [],
      activeVault: typeof raw.active_vault === "string" ? raw.active_vault : undefined,
    };
  } catch {
    return { vaults: [] };
  }
}

export function vaultDisplayName(vault: TolariaVault): string {
  return vault.label?.trim() || basename(vault.path) || vault.path;
}

// The helpers below mirror Tolaria's `src/utils/deepLinks.ts` so generated links resolve the same way.

function normalizePathForIdentity(path: string): string {
  return path
    .replaceAll("\\", "/")
    .replace(/^\/private\/tmp(?=\/|$)/u, "/tmp")
    .replace(/\/+$/u, "");
}

function normalizePathForCollision(path: string): string {
  return normalizePathForIdentity(path).toLocaleLowerCase();
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function baseSlugForVault(vault: TolariaVault): string {
  const alias = (vault.alias ?? vault.label ?? "").trim();
  const label = alias || vault.path.split(/[\\/]/).filter(Boolean).pop() || "Workspace";
  return normalizeSlug(label) || "workspace";
}

function stablePathHash(path: string): string {
  let hash = 0x811c9dc5;
  for (const char of normalizePathForCollision(path)) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(6, "0").slice(-6);
}

function uniqueVaults(vaults: readonly TolariaVault[]): TolariaVault[] {
  const byPath = new Map<string, TolariaVault>();
  for (const vault of vaults) {
    const key = normalizePathForCollision(vault.path);
    if (key && !byPath.has(key)) byPath.set(key, vault);
  }
  return [...byPath.values()];
}

function vaultSlug(vault: TolariaVault, allVaults: readonly TolariaVault[]): string {
  const baseSlug = baseSlugForVault(vault);
  const collisions = uniqueVaults(allVaults).filter((candidate) => baseSlugForVault(candidate) === baseSlug);
  return collisions.length > 1 ? `${baseSlug}-${stablePathHash(vault.path)}` : baseSlug;
}

function relativePathInVault(filePath: string, vaultPath: string): string | null {
  const item = normalizePathForIdentity(filePath);
  const prefix = `${normalizePathForIdentity(vaultPath)}/`;
  if (!item.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase())) return null;
  const relative = item.slice(prefix.length);
  const segments = relative.split("/");
  if (!relative || segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  return relative;
}

/**
 * Builds a `tolaria://<vault-slug>/<relative-path>` link for a file.
 * Prefers `preferredVaultPath` when it contains the file, otherwise the deepest registered vault containing it.
 */
export function buildTolariaDeepLink(
  filePath: string,
  vaults: readonly TolariaVault[],
  preferredVaultPath?: string,
): string | null {
  const candidates = uniqueVaults(vaults)
    .filter((vault) => vault.available !== false)
    .map((vault) => ({ vault, relativePath: relativePathInVault(filePath, vault.path) }))
    .filter((candidate): candidate is { vault: TolariaVault; relativePath: string } => candidate.relativePath !== null);

  if (candidates.length === 0) return null;

  const preferred = preferredVaultPath
    ? candidates.find(
        (candidate) =>
          normalizePathForCollision(candidate.vault.path) === normalizePathForCollision(preferredVaultPath),
      )
    : undefined;
  const chosen = preferred ?? candidates.sort((a, b) => b.vault.path.length - a.vault.path.length)[0];

  const encodedPath = chosen.relativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `tolaria://${vaultSlug(chosen.vault, vaults)}/${encodedPath}`;
}
