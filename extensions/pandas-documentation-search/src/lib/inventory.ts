import { promisify } from "util";
import { inflate } from "zlib";

export const INVENTORY_URL = "https://pandas.pydata.org/docs/objects.inv";
export const DOCUMENT_BASE_URL = "https://pandas.pydata.org/docs/";
const ALLOWED_ROLES = new Set([
  "py:function",
  "py:method",
  "py:attribute",
  "py:data",
  "py:class",
  "py:property",
  "py:module",
  "py:exception",
]);
const inflateAsync = promisify(inflate);

export interface InventoryItem {
  id: string;
  name: string;
  shortName: string;
  role: string;
  url: string;
  docPath: string;
  displayName: string;
}

interface RawInventoryLine {
  name: string;
  role: string;
  priority: number;
  uri: string;
  displayName: string;
}

export async function parseInventory(buffer: Buffer): Promise<RawInventoryLine[]> {
  let offset = 0;

  function readLine() {
    const nextNewline = buffer.indexOf(0x0a, offset);
    const end = nextNewline === -1 ? buffer.length : nextNewline;
    const line = buffer.subarray(offset, end).toString("utf-8");
    offset = end + 1;
    return line;
  }

  const header = readLine();
  if (!header.startsWith("# Sphinx inventory version")) {
    const headerSnippet = header.length > 100 ? `${header.slice(0, 100)}...` : header;
    throw new Error(`Unexpected objects.inv header: "${headerSnippet}"`);
  }
  readLine();
  readLine();
  readLine();

  const compressed = buffer.subarray(offset);
  const decompressed = (await inflateAsync(compressed)).toString("utf-8");

  return decompressed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, role, priority, uri, ...rest] = line.split(" ");
      const displayName = rest.length > 0 ? rest.join(" ") : name;
      return {
        name,
        role,
        priority: Number(priority),
        uri,
        displayName,
      };
    });
}

export function dedupeAndFilter(lines: RawInventoryLine[]): InventoryItem[] {
  const seen = new Map<string, InventoryItem>();

  for (const line of lines) {
    if (!line.name.startsWith("pandas.")) {
      continue;
    }

    if (!ALLOWED_ROLES.has(line.role)) {
      continue;
    }

    const urlPath = resolveUri(line.uri, line.name);
    const url = new URL(urlPath, DOCUMENT_BASE_URL).toString();
    const shortName = line.name.startsWith("pandas.") ? line.name.slice("pandas.".length) : line.name;
    const displayName = line.displayName === "-" ? line.name : line.displayName;

    // Filter out private members (names with any segment starting with _ or __)
    const segments = shortName.split(".");
    if (segments.some((segment) => segment.startsWith("_"))) {
      continue;
    }

    const item: InventoryItem = {
      id: line.name,
      name: line.name,
      shortName,
      role: line.role,
      url,
      docPath: urlPath,
      displayName,
    };

    if (!seen.has(item.id)) {
      seen.set(item.id, item);
    }
  }

  return Array.from(seen.values());
}

function resolveUri(uri: string, name: string): string {
  let resolved = uri;

  if (resolved.includes("$")) {
    resolved = resolved.replace(/\$/g, name);
  }

  if (resolved.includes("%s")) {
    resolved = resolved.replace(/%s/g, name);
  }

  return resolved;
}

export async function transformInventoryResponse(buffer: ArrayBuffer): Promise<InventoryItem[]> {
  const raw = Buffer.from(buffer);
  const lines = await parseInventory(raw);
  const filtered = dedupeAndFilter(lines);
  filtered.sort((a, b) => a.shortName.localeCompare(b.shortName));
  return filtered;
}
