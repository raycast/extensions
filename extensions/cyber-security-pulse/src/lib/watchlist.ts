export interface WatchEntry {
  name: string;
  aliases: string[];
}

// Parse a PURL token (pkg:type/namespace/name@version?qualifiers#subpath) into a
// display name + alias candidates. Returns null when the token is not a PURL.
function parsePurl(token: string): { name: string; aliases: string[] } | null {
  if (!token.toLowerCase().startsWith("pkg:")) return null;
  const s = token.slice(4).split("#")[0].split("?")[0];
  const segs = s.split("/").filter(Boolean); // [type, ...namespace, name@version]
  if (segs.length < 2) return null;
  const decode = (v: string) => {
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  // Version "@…" only ever trails the final (name) segment — never the namespace
  // (e.g. npm scopes like @types/node).
  let nameSeg = segs[segs.length - 1];
  const at = nameSeg.lastIndexOf("@");
  if (at > 0) nameSeg = nameSeg.slice(0, at);
  const name = decode(nameSeg);
  const aliases = [name];
  if (segs.length >= 3)
    aliases.push(decode(segs[segs.length - 2]).replace(/^@/, ""));
  return { name, aliases };
}

export function parseWatchlist(raw: string): WatchEntry[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean);
      let name = "";
      const aliases: string[] = [];
      for (const part of parts) {
        const purl = parsePurl(part);
        if (purl) {
          if (!name) name = purl.name;
          aliases.push(...purl.aliases);
        } else {
          if (!name) name = part;
          aliases.push(part);
        }
      }
      const seen = new Set<string>();
      const uniq = aliases.filter((a) => {
        const k = a.toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      return { name: name || uniq[0] || entry, aliases: uniq };
    })
    .filter((e) => e.aliases.length > 0);
}

const rxCache = new Map<string, RegExp>();
function rx(alias: string): RegExp {
  let re = rxCache.get(alias);
  if (!re) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // A leading \b only works before a word char; aliases like ".Net" or "C#"
    // start with punctuation, where \b would never match.
    const boundary = /^\w/.test(alias) ? "\\b" : "";
    re = new RegExp(`${boundary}${escaped}`, "i");
    rxCache.set(alias, re);
  }
  return re;
}

// Returns the first matching watch entry (word-boundary), or undefined.
export function matchWatch(
  text: string,
  entries: WatchEntry[],
): WatchEntry | undefined {
  return entries.find((e) => e.aliases.some((a) => rx(a).test(text)));
}
