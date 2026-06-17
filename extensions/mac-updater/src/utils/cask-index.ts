// Pure cask.json → lookup-index parser. Kept free of any @raycast/api import so
// it can be unit-tested in plain Node, and so the memory-sensitive byte-walking
// lives in one focused place.

// Slim entry — only the fields we actually read at runtime. The full cask.json
// entries are 3-5KB each and there are ~7,700 of them. Slimming to these four
// fields keeps the resident index at a few MB.
export interface CaskEntry {
  token: string;
  name: string[];
  version: string;
  homepage: string;
  /** Installs via a macOS .pkg (so the upgrade will need an admin password). */
  isPkg?: boolean;
}

export interface CaskIndex {
  byBundleId: Map<string, CaskEntry>;
  byName: Map<string, CaskEntry>;
  byToken: Map<string, CaskEntry>;
  fetchedAt: number;
}

// Raw entry shape — only seen transiently while building the index.
interface RawCaskEntry {
  token: string;
  name?: string[];
  version?: string;
  homepage?: string;
  artifacts?: unknown[];
}

/** Slim one raw cask entry into the lookup maps. */
function indexEntry(
  entry: RawCaskEntry,
  byBundleId: Map<string, CaskEntry>,
  byName: Map<string, CaskEntry>,
  byToken: Map<string, CaskEntry>,
): void {
  if (!entry.token) return;
  const slim: CaskEntry = {
    token: entry.token,
    name: entry.name ?? [],
    version: entry.version ?? "",
    homepage: entry.homepage ?? "",
  };
  byToken.set(slim.token, slim);
  for (const n of slim.name) {
    const key = n.toLowerCase().replace(/\.app$/, "");
    if (!byName.has(key)) byName.set(key, slim);
  }
  for (const art of entry.artifacts ?? []) {
    if (typeof art !== "object" || !art) continue;
    const obj = art as Record<string, unknown>;
    // A `pkg` artifact means brew runs the macOS installer as root — i.e. the
    // upgrade will pop an admin-password prompt. Flag it so we can warn first.
    if (obj.pkg) slim.isPkg = true;
    const zap = (obj.zap as Array<Record<string, unknown>> | undefined) ?? [];
    const uninstall =
      (obj.uninstall as Array<Record<string, unknown>> | undefined) ?? [];
    for (const block of [...zap, ...uninstall]) {
      for (const key of ["pkgutil", "quit", "launchctl", "delete", "trash"]) {
        const val = block[key];
        const arr = Array.isArray(val) ? val : val ? [val] : [];
        for (const v of arr) {
          if (typeof v === "string" && /^[a-z0-9]+\.[a-z0-9.-]+$/i.test(v)) {
            if (!byBundleId.has(v)) byBundleId.set(v, slim);
          }
        }
      }
    }
  }
}

/**
 * Build the lookup index from the cask.json Buffer WITHOUT ever materialising
 * the whole 15MB array on the V8 heap.
 *
 * Raycast caps a command's JS heap at 100MB. `JSON.parse` of the full file
 * peaks at ~55MB (the ~7,700-entry object tree) — which, stacked with the rest
 * of a scan, blows the cap ("Command Out of Memory"). Instead we keep the file
 * as a Buffer (external memory — off-heap, doesn't count toward the cap) and
 * walk it byte-by-byte, slicing out one top-level `{…}` object at a time,
 * JSON.parse-ing just that small slice, indexing its slim fields, then letting
 * it be collected. Peak heap stays ~8MB.
 */
export function parseAndIndex(buf: Buffer, fetchedAt: number): CaskIndex {
  const byBundleId = new Map<string, CaskEntry>();
  const byName = new Map<string, CaskEntry>();
  const byToken = new Map<string, CaskEntry>();

  const n = buf.length;
  // Byte codes for the structural characters and the whitespace/comma seps.
  const OPEN = 123, // {
    CLOSE = 125, // }
    QUOTE = 34, // "
    BACKSLASH = 92, // \
    LBRACKET = 91, // [
    RBRACKET = 93; // ]
  let i = 0;
  while (i < n && buf[i] !== LBRACKET) i++; // skip to the opening '['
  i++;
  while (i < n) {
    // Skip whitespace and commas between elements.
    while (
      i < n &&
      (buf[i] === 32 ||
        buf[i] === 10 ||
        buf[i] === 13 ||
        buf[i] === 9 ||
        buf[i] === 44)
    )
      i++;
    if (i >= n || buf[i] === RBRACKET) break;
    if (buf[i] !== OPEN) {
      i++;
      continue;
    }
    // Capture one top-level object, brace-matching with string/escape awareness.
    const start = i;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (; i < n; i++) {
      const c = buf[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === BACKSLASH) esc = true;
        else if (c === QUOTE) inStr = false;
      } else if (c === QUOTE) {
        inStr = true;
      } else if (c === OPEN) {
        depth++;
      } else if (c === CLOSE) {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    try {
      const entry = JSON.parse(buf.toString("utf8", start, i)) as RawCaskEntry;
      indexEntry(entry, byBundleId, byName, byToken);
    } catch {
      /* skip a malformed entry rather than failing the whole index */
    }
  }

  return { byBundleId, byName, byToken, fetchedAt };
}
