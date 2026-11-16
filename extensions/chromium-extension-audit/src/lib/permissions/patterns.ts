import { unique } from "../json";

type Pattern = { scheme: string; host: string; port: string; path: string };
export function parsePattern(value: string): Pattern | undefined {
  if (value === "<all_urls>") return { scheme: "all", host: "*", port: "*", path: "/*" };
  const match = /^(\*|https?|file|ftp):\/\/(\[[\da-f:]+\]|[^/:]*)(?::(\*|\d+))?(\/.*)$/i.exec(value);
  if (!match) return;
  const [, scheme, rawHost, port = "*", path] = match;
  const host = rawHost.toLowerCase();
  if (
    scheme !== "file" &&
    (!host || /[\s?#]/.test(host) || (host.includes("*") && host !== "*" && !/^\*\.[^*]+$/.test(host)))
  )
    return;
  return { scheme: scheme.toLowerCase(), host, port, path };
}
const schemes = (s: string) => (s === "all" ? ["http", "https", "file", "ftp"] : s === "*" ? ["http", "https"] : [s]);
export function normalizePatterns(values: string[], script = false): string[] {
  return unique(
    values.map((v) => {
      const p = parsePattern(v);
      if (!p || p.scheme === "all") return v;
      return `${p.scheme}://${p.host}${p.port === "*" ? "" : `:${p.port}`}${script ? p.path : "/*"}`;
    }),
  );
}
export function covers(parent: string, child: string, script = false): boolean {
  const a = parsePattern(parent),
    b = parsePattern(child);
  if (!a || !b) return parent === child;
  const hostCovered =
    a.host === "*" ||
    a.host === b.host ||
    (a.host.startsWith("*.") && (b.host === a.host.slice(2) || b.host.endsWith(a.host.slice(1))));
  // Conservative containment for paths: arbitrary glob inclusion is not guessed.
  const pathCovered =
    !script ||
    a.path === "/*" ||
    a.path === b.path ||
    (a.path.endsWith("*") && !a.path.slice(0, -1).includes("*") && b.path.startsWith(a.path.slice(0, -1)));
  return (
    schemes(b.scheme).every((s) => schemes(a.scheme).includes(s)) &&
    hostCovered &&
    (a.port === "*" || a.port === b.port) &&
    pathCovered
  );
}
export function uncovered(next: string[], previous: string[], script = false): string[] {
  return next.filter((v) => {
    const p = parsePattern(v);
    if (previous.some((old) => covers(old, v, script))) return false;
    if (p?.scheme === "*" || p?.scheme === "all") {
      return !schemes(p.scheme).every((scheme) =>
        previous.some((old) =>
          covers(old, `${scheme}://${p.host}${p.port === "*" ? "" : `:${p.port}`}${p.path}`, script),
        ),
      );
    }
    return true;
  });
}
export function intersection(a: string[], b: string[], script = false): string[] {
  return unique(
    a.flatMap((x) =>
      b.flatMap((y) => {
        const p = parsePattern(x),
          q = parsePattern(y);
        if (!p || !q) return [];
        if (covers(x, y, script)) return [y];
        if (covers(y, x, script)) return [x];
        const commonSchemes = schemes(p.scheme).filter((s) => schemes(q.scheme).includes(s));
        const host =
          p.host === "*"
            ? q.host
            : q.host === "*"
              ? p.host
              : p.host === q.host
                ? p.host
                : p.host.startsWith("*.") && (q.host === p.host.slice(2) || q.host.endsWith(p.host.slice(1)))
                  ? q.host
                  : q.host.startsWith("*.") && (p.host === q.host.slice(2) || p.host.endsWith(q.host.slice(1)))
                    ? p.host
                    : undefined;
        const port = p.port === "*" ? q.port : q.port === "*" || p.port === q.port ? p.port : undefined;
        const pathname = !script
          ? "/*"
          : p.path === "/*"
            ? q.path
            : q.path === "/*" || p.path === q.path
              ? p.path
              : undefined;
        if (host === undefined || !port || !pathname) return [];
        return commonSchemes.map((s) => `${s}://${host}${port === "*" ? "" : `:${port}`}${pathname}`);
      }),
    ),
  );
}
export function broad(patterns: string[]): boolean {
  return patterns.some((v) => {
    const p = parsePattern(v);
    return p && p.host === "*" && ["all", "*", "http", "https"].includes(p.scheme);
  });
}
export function matchesUrl(pattern: string, url: string, script = false): boolean {
  try {
    const u = new URL(url);
    if (!["http:", "https:", "file:", "ftp:"].includes(u.protocol)) return false;
    const p = parsePattern(pattern);
    if (!p || !covers(pattern, `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}/*`)) return false;
    if (!script) return true;
    const re = new RegExp(
      `^${p.path
        .split("*")
        .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*")}$`,
    );
    return re.test(u.pathname + u.search);
  } catch {
    return false;
  }
}
