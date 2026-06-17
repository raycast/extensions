export interface VaultItem {
  entry: string;
  name: string;
  folder?: string;
  label?: string;
  faviconUrl?: string;
}

export const ALL_FOLDERS = "__all__";
const DOMAIN_PATTERN =
  /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)+$/i;

export function cleanEntryPath(entry: string): string {
  return entry.replace(/\\/g, "/").replace(/\.gpg$/i, "");
}

function toPathParts(entry: string): string[] {
  return entry
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function joinPathParts(parts: string[]): string | undefined {
  return parts.join("/").trim() || undefined;
}

function isDomain(value: string | undefined): value is string {
  return Boolean(value && DOMAIN_PATTERN.test(value));
}

export function toVaultItem(entry: string): VaultItem {
  const cleanEntry = cleanEntryPath(entry);
  const parts = toPathParts(cleanEntry);
  const folder = parts.length > 1 ? parts[0] : undefined;
  const namePart = parts[1];
  const remainingParts = parts.slice(2);

  if (folder && isDomain(namePart)) {
    const domain = namePart.toLowerCase();

    return {
      entry: cleanEntry,
      name: domain,
      folder,
      label: joinPathParts(remainingParts),
      faviconUrl: `https://${domain}`,
    };
  }

  return {
    entry: cleanEntry,
    name: joinPathParts(parts.slice(1)) ?? cleanEntry,
    folder,
  };
}
