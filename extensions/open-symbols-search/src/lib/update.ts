import { environment } from "@raycast/api";
import { existsSync } from "fs";
import { mkdir, rename, rm, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { downloadedIndexPath, getCatalog, Library, RawIndex, reloadCatalog, TreeShas } from "./data";
import { WEIGHTS } from "./render";

/**
 * Checks GitHub for a newer Open Symbols release and, only if symbols were
 * added, removed or redrawn, rewrites the local index.
 *
 * Open Symbols publishes releases as date-named tags (e.g. 2026.11.07) on
 * GitHub, and opensymbols.dev is built from them. GitHub has an API; the site
 * doesn't, so the check goes there. It compares git tree hashes: a library's
 * symbols/ folder hash changes if and only if a symbol in it changed, so an
 * up-to-date check costs one request and a release with no symbol changes a
 * few more. Nothing large is downloaded.
 */

const API = "https://api.github.com/repos/OrchardKit/open-symbols";
const TAG = /^\d{4}\.\d{2}\.\d{2}$/;

type TreeEntry = { path: string; type: "blob" | "tree"; sha: string };

/** Swappable for tests. */
export const http = { fetch: (url: string, init?: RequestInit) => fetch(url, init) };

async function gh<T>(path: string): Promise<T> {
  const res = await http.fetch(`${API}${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "open-symbols-search-raycast" },
  });
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    const when = reset ? ` Try again after ${new Date(reset * 1000).toLocaleTimeString()}.` : "";
    throw new Error(`GitHub's rate limit was reached.${when}`);
  }
  if (!res.ok) throw new Error(`GitHub returned HTTP ${res.status} for ${path}`);
  return (await res.json()) as T;
}

async function tree(shaOrRef: string): Promise<TreeEntry[]> {
  const t = await gh<{ tree: TreeEntry[]; truncated: boolean }>(`/git/trees/${encodeURIComponent(shaOrRef)}`);
  if (t.truncated) throw new Error("GitHub returned a truncated file list");
  return t.tree;
}

export async function latestRelease(): Promise<string | undefined> {
  const tags = await gh<{ name: string }[]>("/tags?per_page=100");
  return tags
    .map((t) => t.name)
    .filter((n) => TAG.test(n))
    .sort()
    .pop();
}

export type LibraryChange = {
  id: string;
  name: string;
  added: string[];
  removed: string[];
  modified: string[];
  isNewLibrary?: boolean;
  isRemovedLibrary?: boolean;
};

export type UpdateCheck =
  | { status: "up-to-date"; ref: string }
  | { status: "no-symbol-changes"; ref: string; latest: string }
  | { status: "available"; ref: string; latest: string; changes: LibraryChange[]; plan: UpdatePlan };

type UpdatePlan = {
  latest: string;
  trees: Record<string, TreeShas>;
  /** Final symbol names per changed (or new) library; absent = library removed. */
  names: Map<string, string[] | undefined>;
};

const symbolNames = (entries: TreeEntry[]) =>
  new Map(entries.filter((e) => e.type === "blob" && e.path.endsWith(".svg")).map((e) => [e.path.slice(0, -4), e.sha]));

/** Names and licenses for libraries a future release might add. */
const KNOWN: Record<string, Omit<Library, "id">> = {
  feather: { name: "Feather", license: "MIT" },
  "font-awesome": { name: "Font Awesome", license: "CC BY 4.0" },
  heroicons: { name: "Heroicons", license: "MIT" },
  hugeicons: { name: "Hugeicons", license: "MIT" },
  iconoir: { name: "Iconoir", license: "MIT" },
  ionicons: { name: "Ionicons", license: "MIT" },
  lucide: { name: "Lucide", license: "ISC" },
  "pictogrammers-material-design": { name: "Material Design Icons", license: "Apache 2.0" },
  phosphor: { name: "Phosphor", license: "MIT" },
  tabler: { name: "Tabler", license: "MIT" },
};

const titleCase = (id: string) =>
  id.replace(/(^|-)(\w)/g, (_, sep: string, c: string) => (sep ? " " : "") + c.toUpperCase());

/**
 * @param knownUnchanged a release already found to have no symbol changes,
 *   so it isn't diffed again.
 */
export async function checkForUpdates(knownUnchanged?: string): Promise<UpdateCheck> {
  const catalog = getCatalog();
  const ref = catalog.ref;
  const latest = await latestRelease();
  if (!latest || latest <= ref) return { status: "up-to-date", ref };
  if (latest === knownUnchanged) return { status: "no-symbol-changes", ref, latest };

  const known = catalog.raw.trees ?? {};
  const root = await tree(latest);
  const dirs = new Map(root.filter((e) => e.type === "tree").map((e) => [e.path, e.sha]));

  const trees: Record<string, TreeShas> = { ...known };
  const names = new Map<string, string[] | undefined>();
  const changes: LibraryChange[] = [];

  for (const [id, dirSha] of dirs) {
    const before = known[id];
    if (before?.dir === dirSha) continue; // Nothing in this library's folder changed.
    const symbolsSha = (await tree(dirSha)).find((e) => e.path === "symbols" && e.type === "tree")?.sha;
    if (!symbolsSha) continue; // Not a symbol library (docs, scripts, …).
    trees[id] = { dir: dirSha, symbols: symbolsSha };
    if (before?.symbols === symbolsSha) continue; // Only README/LICENSE changed.

    const next = symbolNames(await tree(symbolsSha));
    const prev = before?.symbols ? symbolNames(await tree(before.symbols)) : new Map<string, string>();
    const library = catalog.libraries.find((l) => l.id === id);
    changes.push({
      id,
      name: library?.name ?? KNOWN[id]?.name ?? titleCase(id),
      added: [...next.keys()].filter((n) => !prev.has(n)),
      removed: [...prev.keys()].filter((n) => !next.has(n)),
      modified: [...next.keys()].filter((n) => prev.has(n) && prev.get(n) !== next.get(n)),
      isNewLibrary: !library,
    });
    names.set(id, [...next.keys()].sort());
  }

  // Libraries that disappeared from the release.
  for (const library of catalog.libraries) {
    if (dirs.has(library.id)) continue;
    const removed = catalog.symbols.filter((s) => s.library.id === library.id).map((s) => s.name);
    changes.push({ id: library.id, name: library.name, added: [], removed, modified: [], isRemovedLibrary: true });
    names.set(library.id, undefined);
    delete trees[library.id];
  }

  const real = changes.filter((c) => c.added.length || c.removed.length || c.modified.length);
  if (real.length === 0) return { status: "no-symbol-changes", ref, latest };
  return { status: "available", ref, latest, changes: real, plan: { latest, trees, names } };
}

/** Builds the new index, keeping tags for existing symbols and borrowing them for new ones. */
function buildIndex(plan: UpdatePlan): RawIndex {
  const catalog = getCatalog();
  const pool = new Map<string, Set<string>>();
  for (const s of catalog.symbols) {
    const set = pool.get(s.baseName) ?? new Set<string>();
    s.tags.forEach((t) => set.add(t));
    pool.set(s.baseName, set);
  }
  const existingTags = new Map(catalog.symbols.map((s) => [s.key, s.tags]));

  const libraries: Library[] = catalog.libraries.filter(
    (l) => plan.names.get(l.id) !== undefined || !plan.names.has(l.id),
  );
  for (const [id, list] of plan.names) {
    if (list && !libraries.some((l) => l.id === id))
      libraries.push({ id, ...(KNOWN[id] ?? { name: titleCase(id), license: "See library license" }) });
  }
  libraries.sort((a, b) => a.name.localeCompare(b.name));

  const symbols: RawIndex["symbols"] = [];
  libraries.forEach((library, li) => {
    const list =
      plan.names.get(library.id) ?? catalog.symbols.filter((s) => s.library.id === library.id).map((s) => s.name);
    for (const name of list) {
      const base = name.endsWith(".fill") ? name.slice(0, -5) : name;
      const stem = base.replace(/-(outline|solid|filled|\d+)$/, "");
      const words = new Set(name.split(/[-.]/));
      const tags =
        existingTags.get(`${library.id}/${name}`) ??
        [...(pool.get(base) ?? pool.get(stem) ?? [])].filter((t) => !words.has(t)).sort();
      symbols.push(tags.length ? [li, name, tags.join(" ")] : [li, name]);
    }
  });
  return { ref: plan.latest, trees: plan.trees, libraries, symbols };
}

/**
 * Writes the new index, then moves the symbol cache to the new release so
 * unchanged symbols don't need downloading again. Cached files for redrawn or
 * removed symbols are deleted.
 */
export async function applyUpdate(check: Extract<UpdateCheck, { status: "available" }>) {
  const index = buildIndex(check.plan);
  const target = downloadedIndexPath();
  await mkdir(dirname(target), { recursive: true });
  await writeFile(`${target}.tmp`, JSON.stringify(index), "utf8");
  await rename(`${target}.tmp`, target);

  const cacheRoot = join(environment.supportPath, "cache");
  const from = join(cacheRoot, check.ref);
  const to = join(cacheRoot, check.latest);
  if (existsSync(from) && !existsSync(to)) {
    await rename(from, to);
    const stale = check.changes.flatMap((c) => [...c.modified, ...c.removed].map((name) => ({ lib: c.id, name })));
    const variants = [...WEIGHTS, "strip"];
    await Promise.all(
      stale.flatMap(({ lib, name }) => [
        rm(join(to, "templates", lib, `${name}.svg`), { force: true }),
        ...variants.flatMap((w) =>
          ["light", "dark"].map((mode) => rm(join(to, "previews-v2", w, lib, `${name}.${mode}.svg`), { force: true })),
        ),
      ]),
    );
  }
  reloadCatalog();
  return index;
}
