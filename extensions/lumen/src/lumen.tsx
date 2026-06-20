import { Action, ActionPanel, Color, Icon, List, getPreferenceValues, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { readdir, stat } from "node:fs/promises";
import type { Stats } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { Fzf, extendedMatch } from "fzf";
import { Workspace, getWorkspaces } from "./lib/workspaces";
import { ScanEntry, scan } from "./lib/scan";
import { parseQuery } from "./lib/query";
import { Category, extensionsForCodes, getCategories } from "./lib/categories";
import { ResolvedTool, getOrderTools, resolveCommand } from "./lib/commands";
import { ResolvedQualifier, dateMatches, getDateQualifiers } from "./lib/dates";
import { HOME_ROOT, disposeIndex, indexHome, streamFilter } from "./lib/home";
import { t } from "./lib/i18n";

const MAX_RESULTS = 200;

// ⌘R action, shared by scoped and Home views.
function refreshAction(onRefresh: () => void) {
  return (
    <Action
      title={t("action.refreshIndex")}
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={onRefresh}
    />
  );
}

// Shared item actions: Enter opens, ⌘C copies the containing folder (the common case),
// ⌘⇧C the full path, ⌘F reveals in Finder, ⌘D toggles Quick Look (one-hand C/D/F).
function itemActions(path: string, isDir: boolean, onRefresh: () => void) {
  return (
    <ActionPanel>
      <Action.Open title={isDir ? t("action.openInFinder") : t("action.open")} target={path} />
      <Action.CopyToClipboard
        title={t("action.copyFolderPath")}
        content={isDir ? path : dirname(path)}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.CopyToClipboard
        title={t("action.copyFullPath")}
        content={path}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.ShowInFinder title={t("action.showInFinder")} path={path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
      <Action.ToggleQuickLook title={t("action.quickLook")} shortcut={{ modifiers: ["cmd"], key: "d" }} />
      {refreshAction(onRefresh)}
    </ActionPanel>
  );
}
// With an order command active, stat at most this many of the most-relevant matches.
const STAT_CAP = 500;

interface Displayed {
  rel: string;
  isDir: boolean;
  datum?: string; // date/size shown when an order command is active
}

// Lowercase extension of a path's filename, no dot. "" for extensionless/dotfiles.
function extOf(rel: string): string {
  const name = basename(rel);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

// Keep the END readable (the extension) by truncating from the front. Best-effort —
// Raycast exposes no width, so this is a heuristic cap.
function truncateFront(s: string, max = 44): string {
  return s.length > max ? "…" + s.slice(s.length - max + 1) : s;
}

interface Preferences {
  firstLevelSort: "modified" | "name";
  homeExcludeWorkspaces: boolean;
}

interface Entry {
  name: string;
  path: string;
  isDir: boolean;
  mtime: number;
}

// Exact alias or number match for the first token typed before a space.
function matchToken(token: string, workspaces: Workspace[]): Workspace | undefined {
  return workspaces.find((w) => w.aliases.includes(token.toLowerCase()) || String(w.number) === token);
}

// Read-only: lists the top level, never mutates the folder.
async function readFirstLevel(path: string, sort: Preferences["firstLevelSort"]): Promise<Entry[]> {
  const dirents = await readdir(path, { withFileTypes: true });
  const visible = dirents.filter((d) => !d.name.startsWith("."));
  const entries = await Promise.all(
    visible.map(async (d) => {
      const full = join(path, d.name);
      let mtime = 0;
      if (sort === "modified") {
        try {
          mtime = (await stat(full)).mtimeMs;
        } catch {
          // unreadable entry, keep mtime 0
        }
      }
      return { name: d.name, path: full, isDir: d.isDirectory(), mtime };
    }),
  );
  if (sort === "modified") entries.sort((a, b) => b.mtime - a.mtime);
  else entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

export default function Command() {
  const { firstLevelSort, homeExcludeWorkspaces } = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tools, setTools] = useState<ResolvedTool[]>([]);
  const [qualifiers, setQualifiers] = useState<ResolvedQualifier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [ws, cats, ts, qs] = await Promise.all([
        getWorkspaces(),
        getCategories(),
        getOrderTools(),
        getDateQualifiers(),
      ]);
      setWorkspaces(ws);
      setCategories(cats);
      setTools(ts);
      setQualifiers(qs);
      setIsLoading(false);
    })();
  }, []);

  function open(workspace: Workspace, initialQuery = "") {
    push(
      <FirstLevel
        workspace={workspace}
        sort={firstLevelSort}
        initialQuery={initialQuery}
        categories={categories}
        tools={tools}
        qualifiers={qualifiers}
      />,
    );
  }

  // One-line entry: "alias query" enters a workspace; the reserved token "h" enters
  // Home mode (~). Both carry the remainder as the query.
  function onSearchTextChange(text: string) {
    const space = text.indexOf(" ");
    if (space > 0) {
      const token = text.slice(0, space);
      const remainder = text.slice(space + 1);
      if (token === "h") {
        const excludePrefixes = homeExcludeWorkspaces ? workspaces.map((w) => w.path) : [];
        push(
          <HomeSearch
            initialQuery={remainder}
            categories={categories}
            tools={tools}
            qualifiers={qualifiers}
            excludePrefixes={excludePrefixes}
          />,
        );
        return;
      }
      const ws = matchToken(token, workspaces);
      if (ws) open(ws, remainder);
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder={t("selector.placeholder")}
    >
      <List.EmptyView
        title={workspaces.length === 0 ? t("selector.empty.none.title") : t("selector.empty.nomatch.title")}
        description={workspaces.length === 0 ? t("selector.empty.none.desc") : t("selector.empty.nomatch.desc")}
      />
      {workspaces.map((w) => (
        <List.Item
          key={w.id}
          icon={Icon.Folder}
          title={w.name}
          subtitle={w.aliases.join(", ")}
          keywords={[...w.aliases, ...(w.number !== undefined ? [String(w.number)] : [])]}
          accessories={w.number !== undefined ? [{ tag: { value: String(w.number), color: Color.SecondaryText } }] : []}
          actions={
            <ActionPanel>
              <Action title={t("action.enterWorkspace")} icon={Icon.ArrowRight} onAction={() => open(w)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function FirstLevel({
  workspace,
  sort,
  initialQuery,
  categories,
  tools,
  qualifiers,
}: {
  workspace: Workspace;
  sort: Preferences["firstLevelSort"];
  initialQuery: string;
  categories: Category[];
  tools: ResolvedTool[];
  qualifiers: ResolvedQualifier[];
}) {
  const root = workspace.path;
  const [query, setQuery] = useState(initialQuery);
  const [reloadKey, setReloadKey] = useState(0);

  const [firstLevel, setFirstLevel] = useState<Entry[]>([]);
  const [entries, setEntries] = useState<ScanEntry[] | null>(null);
  const [loadingFirstLevel, setLoadingFirstLevel] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Walk once on entering (and on ⌘R): top level for the empty state, full fd
  // list for the recursive search. Both are read-only.
  useEffect(() => {
    let cancelled = false;
    setLoadingFirstLevel(true);
    setScanning(true);
    readFirstLevel(root, sort)
      .then((list) => !cancelled && setFirstLevel(list))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not read folder"))
      .finally(() => !cancelled && setLoadingFirstLevel(false));
    scan(root)
      .then((list) => !cancelled && setEntries(list))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "fd scan failed"))
      .finally(() => !cancelled && setScanning(false));
    return () => {
      cancelled = true;
    };
  }, [root, sort, reloadKey]);

  // fzf ranks over paths relative to the root (matches "ruta relativa + nombre").
  // dirByRel lets us put folders first and render routes vs filenames.
  const { fzf, dirByRel } = useMemo(() => {
    if (!entries) return { fzf: null, dirByRel: null };
    const rels = entries.map((e) => relative(root, e.path));
    const dirByRel = new Map(rels.map((rel, i) => [rel, entries[i].isDir]));
    // extendedMatch: space-separated terms are ANDed (e.g. "pr pl" = "pr" AND "pl").
    return { fzf: new Fzf(rels, { match: extendedMatch }), dirByRel };
  }, [entries, root]);

  const trimmed = query.trim();
  const searching = trimmed.length > 0;

  const parsed = useMemo(() => parseQuery(query), [query]);
  const typeExts = useMemo(() => {
    const set = new Set(parsed.exts);
    for (const e of extensionsForCodes(parsed.cats, categories)) set.add(e);
    return set;
  }, [parsed, categories]);

  // Ranking model:
  //   - Type filter (.ext/-cat resolved): files of that type only, by score then depth.
  //   - File intent (a "-" or ".ext" typed): files grouped first, folders after.
  //   - Otherwise: segment (earlier match wins) -> score -> folders-first tiebreak.
  // The segment signal clusters a folder with its descendants; the score lets a clearly
  // better file beat weakly-matching folders without forcing "folders first" absolutely.
  const results = useMemo(() => {
    if (!searching || !fzf || !dirByRel || !entries) return [];
    const termQuery = parsed.terms.join(" ");
    const hardFilter = typeExts.size > 0;
    const filesIntent = parsed.filesIntent;
    // Affinity of the leaf name with the last term: starts-with (0) > contains (1) >
    // scattered (2). This is what makes "li" rank "LiFePo4…" (prefix) above "…libretas".
    const lastTerm = parsed.terms.length ? parsed.terms[parsed.terms.length - 1].toLowerCase() : "";
    const nameRank = (rel: string) => {
      if (!lastTerm) return 0;
      const name = basename(rel).toLowerCase();
      return name.startsWith(lastTerm) ? 0 : name.includes(lastTerm) ? 1 : 2;
    };

    let ranked = termQuery
      ? fzf.find(termQuery).map((r) => ({
          rel: r.item,
          score: r.score,
          isDir: dirByRel.get(r.item) ?? false,
          seg: (r.item.slice(0, r.start).match(/\//g) ?? []).length,
          np: nameRank(r.item),
          depth: r.item.split("/").length - 1,
        }))
      : entries.map((e) => {
          const rel = relative(root, e.path);
          return { rel, score: 0, isDir: e.isDir, seg: 0, np: nameRank(rel), depth: rel.split("/").length - 1 };
        });

    if (hardFilter) ranked = ranked.filter((x) => !x.isDir && typeExts.has(extOf(x.rel)));

    // np (leaf-name affinity) is a tiebreak AFTER score, not before: the full-path score
    // already favors items whose whole route matches all terms (e.g. files under a folder
    // that matched the query), while np only decides between equally-scored matches
    // (e.g. "LiFePo4" prefix over "…libretas" contains).
    ranked.sort((a, b) => {
      if (hardFilter) {
        if (a.score !== b.score) return b.score - a.score;
        if (a.np !== b.np) return a.np - b.np;
        if (a.depth !== b.depth) return a.depth - b.depth;
        return a.rel.localeCompare(b.rel);
      }
      if (filesIntent && a.isDir !== b.isDir) return a.isDir ? 1 : -1; // files first
      if (a.seg !== b.seg) return a.seg - b.seg; // match in an earlier segment wins
      if (a.score !== b.score) return b.score - a.score; // overall match quality
      if (a.np !== b.np) return a.np - b.np; // tiebreak: starts-with > contains > scattered
      if (!filesIntent && a.isDir !== b.isDir) return a.isDir ? -1 : 1; // folders-first tiebreak
      if (a.depth !== b.depth) return a.depth - b.depth;
      if (a.rel.length !== b.rel.length) return a.rel.length - b.rel.length;
      return a.rel.localeCompare(b.rel);
    });

    return ranked.map((x) => x.rel);
  }, [searching, fzf, dirByRel, entries, parsed, typeExts, root]);

  // Order command (--dc/--dm/--big): stat the most-relevant matches (capped), filter by
  // arg, sort by the field. Async because of fs.stat; only touches the result set.
  const orderCmd = parsed.cmd ? resolveCommand(parsed.cmd.name, tools) : undefined;
  const cmdArgsKey = (parsed.cmd?.args ?? []).join(",");
  const [ordered, setOrdered] = useState<Displayed[] | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    if (!orderCmd) {
      setOrdered(null);
      return;
    }
    let cancelled = false;
    setOrderLoading(true);
    const args = parsed.cmd?.args ?? [];
    const subset = results.slice(0, STAT_CAP);
    (async () => {
      const stats = await Promise.all(
        subset.map(async (rel) => {
          try {
            return { rel, s: await stat(join(root, rel)) };
          } catch {
            return null;
          }
        }),
      );
      let items = stats.filter((x): x is { rel: string; s: Stats } => x !== null);
      if (orderCmd.dateOf && args.length) {
        const now = new Date();
        items = items.filter((x) => dateMatches(orderCmd.dateOf!(x.s), args, qualifiers, now));
      }
      items.sort((a, b) => orderCmd.value(b.s) - orderCmd.value(a.s));
      const out: Displayed[] = items.slice(0, MAX_RESULTS).map((x) => ({
        rel: x.rel,
        isDir: dirByRel?.get(x.rel) ?? false,
        datum: orderCmd.format(x.s),
      }));
      if (!cancelled) {
        setOrdered(out);
        setOrderLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderCmd, cmdArgsKey, qualifiers, results, root, dirByRel]);

  const displayed: Displayed[] = orderCmd
    ? (ordered ?? [])
    : results.slice(0, MAX_RESULTS).map((rel) => ({ rel, isDir: dirByRel?.get(rel) ?? false }));

  const onRefresh = () => setReloadKey((k) => k + 1);

  return (
    <List
      isLoading={searching ? scanning || (!!orderCmd && orderLoading) : loadingFirstLevel}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      navigationTitle={workspace.name}
      searchBarPlaceholder={t("firstLevel.placeholder", { name: workspace.name })}
    >
      <List.EmptyView
        title={error ?? (searching ? t("search.noresults.title") : t("firstLevel.empty.title"))}
        description={error ? root : searching ? t("search.noresults.desc") : t("firstLevel.empty.desc")}
        actions={<ActionPanel>{refreshAction(onRefresh)}</ActionPanel>}
      />

      {!searching &&
        firstLevel.map((e) => (
          <List.Item
            key={e.path}
            icon={{ fileIcon: e.path }}
            title={e.name}
            quickLook={{ path: e.path, name: e.name }}
            accessories={e.isDir ? [{ icon: Icon.Folder }] : []}
            actions={itemActions(e.path, e.isDir, onRefresh)}
          />
        ))}

      {searching &&
        displayed.map(({ rel, isDir, datum }) => {
          const path = join(root, rel);
          const ext = extOf(rel);
          // Right side: date/size when ordering, else the front-truncated filename; plus a
          // type tag for files so the extension is always legible even if the name truncates.
          const accessories: List.Item.Accessory[] = [];
          if (datum) accessories.push({ text: datum });
          else if (!isDir) accessories.push({ text: truncateFront(basename(rel)) });
          if (!isDir && ext) accessories.push({ tag: ext.toUpperCase() });
          return (
            <List.Item
              key={path}
              icon={{ fileIcon: path }}
              title={rel}
              quickLook={{ path, name: basename(rel) }}
              accessories={accessories}
              actions={itemActions(path, isDir, onRefresh)}
            />
          );
        })}
    </List>
  );
}

// Home mode (`h`): global fuzzy search over ~. Different engine — the tree is huge, so
// fd indexes to a temp file on disk and the fzf binary streams/filters it per keystroke;
// the list never enters JS memory. Grammar and keyboard are shared with scoped search.
function HomeSearch({
  initialQuery,
  categories,
  tools,
  qualifiers,
  excludePrefixes,
}: {
  initialQuery: string;
  categories: Category[];
  tools: ResolvedTool[];
  qualifiers: ResolvedQualifier[];
  excludePrefixes: string[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [reloadKey, setReloadKey] = useState(0);
  const [indexPath, setIndexPath] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(true);
  const [searching, setSearching] = useState(false);
  const [displayed, setDisplayed] = useState<Displayed[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Index ~ once on entering (and on ⌘R); dispose the temp index on leaving.
  useEffect(() => {
    let path: string | null = null;
    let cancelled = false;
    setIndexing(true);
    indexHome(excludePrefixes)
      .then((p) => {
        if (cancelled) return disposeIndex(p);
        path = p;
        setIndexPath(p);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "fd index failed"))
      .finally(() => !cancelled && setIndexing(false));
    return () => {
      cancelled = true;
      if (path) disposeIndex(path);
    };
    // excludePrefixes is a stable prop captured at push time, so reloadKey is enough.
  }, [reloadKey]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  // Filter the on-disk index with the fzf binary, then (lazily) stat the ≤200 results for
  // type filtering and order commands — only the result set is touched.
  useEffect(() => {
    if (!indexPath) return;
    const parsed = parseQuery(debounced);
    const termQuery = parsed.terms.join(" ");
    if (!termQuery) {
      setDisplayed([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setSearching(true);
    (async () => {
      try {
        const paths = await streamFilter(indexPath, termQuery, controller.signal);
        const typeExts = new Set(parsed.exts);
        for (const e of extensionsForCodes(parsed.cats, categories)) typeExts.add(e);
        const hardFilter = typeExts.size > 0;
        const orderCmd = parsed.cmd ? resolveCommand(parsed.cmd.name, tools) : undefined;
        const args = parsed.cmd?.args ?? [];

        const stats = await Promise.all(
          paths.map(async (p) => {
            try {
              return { p, s: await stat(p) };
            } catch {
              return null;
            }
          }),
        );
        let items = stats.filter((x): x is { p: string; s: Stats } => x !== null);
        if (hardFilter) items = items.filter((x) => !x.s.isDirectory() && typeExts.has(extOf(x.p)));

        if (orderCmd) {
          if (orderCmd.dateOf && args.length) {
            const now = new Date();
            items = items.filter((x) => dateMatches(orderCmd.dateOf!(x.s), args, qualifiers, now));
          }
          items.sort((a, b) => orderCmd.value(b.s) - orderCmd.value(a.s));
        } else {
          // Apply the scoped hierarchy weights to the fzf binary's top matches. We have no
          // per-item score from the binary, so its output order is the relevance fallback;
          // on top we layer folders-first (files-first with a dash), starts-with name
          // affinity, and shallower-first — the same feel as scoped search.
          const lastTerm = parsed.terms.length ? parsed.terms[parsed.terms.length - 1].toLowerCase() : "";
          const nameRank = (p: string) => {
            if (!lastTerm) return 0;
            const name = basename(p).toLowerCase();
            return name.startsWith(lastTerm) ? 0 : name.includes(lastTerm) ? 1 : 2;
          };
          const relevance = new Map(paths.map((p, i) => [p, i]));
          items.sort((a, b) => {
            const aDir = a.s.isDirectory();
            const bDir = b.s.isDirectory();
            if (aDir !== bDir) return (parsed.filesIntent ? bDir : aDir) ? -1 : 1;
            const an = nameRank(a.p);
            const bn = nameRank(b.p);
            if (an !== bn) return an - bn;
            const ad = a.p.split("/").length;
            const bd = b.p.split("/").length;
            if (ad !== bd) return ad - bd; // shallower first
            return (relevance.get(a.p) ?? 0) - (relevance.get(b.p) ?? 0); // fzf relevance
          });
        }
        const out: Displayed[] = items.map((x) => ({
          rel: x.p,
          isDir: x.s.isDirectory(),
          datum: orderCmd ? orderCmd.format(x.s) : undefined,
        }));
        if (!cancelled) setDisplayed(out);
      } catch (e) {
        if (!cancelled && !controller.signal.aborted) setError(e instanceof Error ? e.message : "fzf filter failed");
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [indexPath, debounced, categories, tools, qualifiers]);

  const onRefresh = () => setReloadKey((k) => k + 1);
  const hasQuery = parseQuery(query).terms.length > 0;

  return (
    <List
      isLoading={indexing || searching}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      navigationTitle={t("home.nav")}
      searchBarPlaceholder={t("home.placeholder")}
    >
      <List.EmptyView
        title={
          error ?? (indexing ? t("home.indexing") : hasQuery ? t("search.noresults.title") : t("home.empty.title"))
        }
        description={error ? HOME_ROOT : hasQuery ? t("search.noresults.desc") : t("home.empty.desc")}
        actions={<ActionPanel>{refreshAction(onRefresh)}</ActionPanel>}
      />
      {displayed.map(({ rel, isDir, datum }) => {
        const ext = extOf(rel);
        const accessories: List.Item.Accessory[] = [];
        if (datum) accessories.push({ text: datum });
        else if (!isDir) accessories.push({ text: truncateFront(basename(rel)) });
        if (!isDir && ext) accessories.push({ tag: ext.toUpperCase() });
        return (
          <List.Item
            key={rel}
            icon={{ fileIcon: rel }}
            title={rel}
            quickLook={{ path: rel, name: basename(rel) }}
            accessories={accessories}
            actions={itemActions(rel, isDir, onRefresh)}
          />
        );
      })}
    </List>
  );
}
