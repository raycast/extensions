import {
  List,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { spawn, execFile, ChildProcess } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const HOME = os.homedir();
const INDEX_DIR = path.join(HOME, ".cache", "hypersearch");
const pickBin = (cands: string[]) =>
  cands.find((p) => (p.includes("/") ? fs.existsSync(p) : true))!;
const FD = pickBin(["/opt/homebrew/bin/fd", "/usr/local/bin/fd", "fd"]);
const FZF = pickBin(["/opt/homebrew/bin/fzf", "/usr/local/bin/fzf", "fzf"]);
const RG = ["/opt/homebrew/bin/rg", "/usr/local/bin/rg"].find((p) =>
  fs.existsSync(p),
);

const BASE_EXCLUDES = [
  ".git",
  ".svn",
  ".hg",
  "node_modules",
  ".Trash",
  ".DS_Store",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".cache",
  ".npm",
  ".npx",
  ".bun",
  ".yarn",
  ".pnpm-store",
  ".cargo",
  ".cargo-target",
  ".rustup",
  ".pub-cache",
  ".dartServer",
  ".gem",
  ".gradle",
  ".m2",
  ".cocoapods",
  "Pods",
  "DerivedData",
  ".next",
  ".nuxt",
  "dist",
  "build",
  "target",
  ".venv",
  ".venv*",
  ".venvs",
  "venv",
  ".tox",
  "site-packages",
  ".conda",
  ".pyenv",
  ".nvm",
  ".volta",
  ".deno",
  ".local",
  ".terraform",
  ".serverless",
  ".vercel",
  ".composer",
  ".nuget",
  ".gg",
  ".gemini",
  ".cmux-snapshots",
  ".orbstack",
  ".lmstudio",
  "Library",
  "go/pkg",
];
const ALL_EXCLUDES = ["System", "dev", "net", "Volumes", "cores", "private/var"];

interface Prefs {
  includeHidden: boolean;
  includeIgnored: boolean;
  extraExcludes: string;
  customSearchPaths: string;
  indexMaxAgeMinutes: string;
  resultLimit: string;
}

type Scope = "home" | "downloads" | "documents" | "applications" | "all" | "custom";

function scopePaths(scope: Scope, prefs: Prefs): string[] {
  switch (scope) {
    case "home":
      return [HOME];
    case "downloads":
      return [path.join(HOME, "Downloads")];
    case "documents":
      return [path.join(HOME, "Documents")];
    case "applications":
      return ["/Applications", path.join(HOME, "Applications")];
    case "all":
      return ["/"];
    case "custom":
      return (prefs.customSearchPaths || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  }
}

const indexPathFor = (scope: Scope) =>
  path.join(INDEX_DIR, `index-${scope}.txt`);
const shardDirFor = (scope: Scope) =>
  path.join(INDEX_DIR, `index-${scope}.d`);
const SPLIT = ["/usr/bin/split", "/usr/sbin/split"].find((p) =>
  fs.existsSync(p),
);
const SHARD_COUNT = 8;
// Per-shard match cap -> at most SHARD_COUNT*cap candidates reach fzf,
// which bounds the worst-case query (e.g. "e") at ~30ms instead of seconds.
const SHARD_CAP = 4000;
const FILE_CAP = 32000;

const inFlight = new Map<string, Promise<void>>();

// The flat index stays canonical; shards are a derived cache that lets
// rg scan all 8 in parallel (~4x) and gives -m a spread across the tree.
async function shardIndex(file: string, dir: string): Promise<void> {
  if (!SPLIT || !fs.existsSync(file) || fs.statSync(file).size === 0)
    return;
  const tmpDir = `${dir}.tmp`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const c = spawn(SPLIT!, [
      "-n",
      String(SHARD_COUNT),
      file,
      path.join(tmpDir, "s-"),
    ]);
    c.on("error", reject);
    c.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`split exited ${code}`)),
    );
  });
  fs.rmSync(dir, { recursive: true, force: true });
  fs.renameSync(tmpDir, dir);
}

// Search target: shard dir when available (parallel scan), flat file else.
function searchTarget(
  scope: Scope,
): { target: string; isDir: boolean } {
  const dir = shardDirFor(scope);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0)
    return { target: dir, isDir: true };
  return { target: indexPathFor(scope), isDir: false };
}

function rebuildIndex(scope: Scope, prefs: Prefs): Promise<void> {
  const file = indexPathFor(scope);
  const pending = inFlight.get(file);
  if (pending) return pending;

  const job = new Promise<void>((resolve, reject) => {
    const tmp = `${file}.tmp`;
    const dirs = scopePaths(scope, prefs);
    if (dirs.length === 0) {
      fs.writeFileSync(tmp, "");
      fs.renameSync(tmp, file);
      resolve();
      return;
    }
    const excludes = [
      ...BASE_EXCLUDES,
      ...(prefs.extraExcludes || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      ...(scope === "all" ? ALL_EXCLUDES : []),
    ];
    const args = ["--absolute-path", "--color=never"];
    if (prefs.includeHidden) args.push("--hidden");
    if (prefs.includeIgnored) args.push("--no-ignore");
    for (const e of excludes) args.push("--exclude", e);
    args.push("", ...dirs);

    const out = fs.createWriteStream(tmp);
    const child = spawn(FD, args);
    child.stdout.pipe(out);
    child.stderr.resume();
    child.on("error", reject);
    child.on("close", (code) => {
      out.close(() => {
        if (code === 0) {
          fs.renameSync(tmp, file);
          shardIndex(file, shardDirFor(scope))
            .catch(() => {})
            .then(resolve);
        } else {
          fs.rmSync(tmp, { force: true });
          reject(new Error(`fd exited with code ${code}`));
        }
      });
    });
  }).finally(() => inFlight.delete(file));

  inFlight.set(file, job);
  return job;
}

async function ensureIndex(
  scope: Scope,
  prefs: Prefs,
  force = false,
): Promise<string> {
  const file = indexPathFor(scope);
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  const maxAgeMs =
    Math.max(1, parseFloat(prefs.indexMaxAgeMinutes || "15")) * 60_000;
  const exists = fs.existsSync(file);
  const stale =
    exists && Date.now() - fs.statSync(file).mtimeMs > maxAgeMs;
  if (exists && !stale && !force) {
    await ensureShards(scope);
    return file;
  }
  if (exists && stale && !force) {
    rebuildIndex(scope, prefs).catch(() => {});
    await ensureShards(scope);
    return file; // stale-while-revalidate
  }
  await rebuildIndex(scope, prefs);
  return file;
}

// Shard dir may be missing on upgrade from a flat-index install; split it
// on the fly (~150ms) instead of waiting for the next fd rebuild.
async function ensureShards(scope: Scope): Promise<void> {
  const file = indexPathFor(scope);
  const dir = shardDirFor(scope);
  if (!fs.existsSync(file)) return;
  const dirFresh =
    fs.existsSync(dir) &&
    fs.statSync(dir).mtimeMs >= fs.statSync(file).mtimeMs;
  if (!dirFresh) await shardIndex(file, dir).catch(() => {});
  // Warm the OS page cache so the first keystroke never hits cold disk.
  if (RG && fs.existsSync(dir))
    spawn(RG, ["-c", "--no-ignore", ".", dir], {
      stdio: "ignore",
      detached: true,
    }).unref();
}

// Pipeline: rg(term1, file/dir directly) -> rg(term2) ... -> fzf --filter
// rg narrows the index to ~2k candidates in ~25ms (8 parallel shards);
// fzf ranks them. Each shard is -m capped so worst-case queries stay ~30ms.
function runSearch(
  query: string,
  scope: Scope,
  limit: number,
  onSpawn: (c: ChildProcess[]) => void,
): Promise<string[]> {
  return new Promise((resolve) => {
    const terms = query.split(/\s+/).filter(Boolean);
    const children: ChildProcess[] = [];
    onSpawn(children);

    let stream: NodeJS.ReadableStream | undefined;
    if (RG) {
      const { target, isDir } = searchTarget(scope);
      for (const [i, term] of terms.entries()) {
        const args = isDir
          ? ["--no-ignore", "-S", "-F", "-m", String(SHARD_CAP), "--no-line-number", "--", term]
          : ["-S", "-F", "-m", String(FILE_CAP), "--no-line-number", "--", term];
        if (i === 0) args.push(target);
        const p = spawn(RG, args, {
          stdio: ["pipe", "pipe", "ignore"],
        });
        children.push(p);
        p.stdin!.on("error", () => {}); // EPIPE on early kill
        p.stdout!.on("error", () => {});
        if (stream) stream.pipe(p.stdin!);
        stream = p.stdout!;
      }
    }
    if (!stream) {
      stream = fs.createReadStream(indexPathFor(scope));
      stream.on("error", () => {});
    }
    const fz = spawn(
      FZF,
      [`--filter=${query}`, "--scheme=path", "--no-bold"],
      { stdio: ["pipe", "pipe", "ignore"] },
    );
    children.push(fz);
    fz.stdin!.on("error", () => {});
    stream.pipe(fz.stdin!);

    let buf = "";
    let lines = 0;
    fz.stdout!.on("data", (d) => {
      const s = d.toString();
      buf += s;
      lines += (s.match(/\n/g) || []).length;
      if (buf.length > 8 * 1024 * 1024 || lines > 5000)
        fz.kill("SIGKILL");
    });
    fz.on("close", () =>
      resolve(buf.split("\n").filter(Boolean).slice(0, limit)),
    );
    fz.on("error", () => resolve([]));
  });
}

// fzf ranks the rg-filtered candidates; afterwards we partition so that
// hits whose basename contains ALL query terms float to the top.
function rerank(paths: string[], q: string): string[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const nameHit: string[] = [];
  const rest: string[] = [];
  for (const p of paths) {
    if (seen.has(p)) continue;
    seen.add(p);
    const base = path.basename(p).toLowerCase();
    (terms.every((t) => base.includes(t)) ? nameHit : rest).push(p);
  }
  return [...nameHit, ...rest];
}

interface Meta {
  size?: number;
  mtime?: Date;
  dir?: boolean;
  gone?: boolean;
}

const humanBytes = (n?: number) => {
  if (n === undefined) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
};

const shortenDir = (p: string) => {
  const dir = path.dirname(p).replace(HOME, "~");
  return dir === "~" ? "~" : dir;
};

const fullPath = (p: string) => p.replace(HOME, "~");

// Middle-truncate: keeps the head + the tail (parent dirs) visible.
const prettyPath = (p: string) => {
  const s = path.dirname(p).replace(HOME, "~");
  if (s.length <= 60) return s;
  const parts = s.split("/").filter(Boolean);
  return `${parts.slice(0, 2).join("/")}/…/${parts.slice(-2).join("/")}`;
};

const IMG_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "heic",
  "tiff",
  "bmp",
  "ico",
]);
const isImage = (p: string) =>
  IMG_EXT.has(path.extname(p).slice(1).toLowerCase());

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const [scope, setScope] = useState<Scope>("home");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [indexing, setIndexing] = useState(true);
  const [searching, setSearching] = useState(false);
  const [meta, setMeta] = useState<Record<string, Meta>>({});
  const [showDetail, setShowDetail] = useState(false);
  const [tick, setTick] = useState(0);
  const procRef = useRef<ChildProcess[]>([]);
  const seq = useRef(0);
  const limit = Math.max(
    10,
    parseInt(prefs.resultLimit || "300", 10) || 300,
  );

  useEffect(() => {
    let alive = true;
    setIndexing(true);
    ensureIndex(scope, prefs)
      .then(() => {
        if (alive) setIndexing(false);
      })
      .catch((e) => {
        if (alive) {
          setIndexing(false);
          showToast({
            style: Toast.Style.Failure,
            title: "Index build failed",
            message: String(e?.message || e),
          });
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  useEffect(() => {
    const q = query.trim();
    if (indexing || q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      const mySeq = ++seq.current;
      setSearching(true);
      for (const p of procRef.current) p.kill("SIGKILL");
      const out = await runSearch(q, scope, limit, (c) => {
        procRef.current = c;
      });
      if (mySeq !== seq.current) return;
      setResults(rerank(out, q));
      setSearching(false);
    }, 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, scope, indexing, tick]);

  useEffect(() => {
    const pending = results.slice(0, 60).filter((p) => !(p in meta));
    if (!pending.length) return;
    let alive = true;
    Promise.all(
      pending.map(async (p): Promise<[string, Meta]> => {
        try {
          const s = await fs.promises.stat(p);
          return [
            p,
            { size: s.size, mtime: s.mtime, dir: s.isDirectory() },
          ];
        } catch {
          return [p, { gone: true }];
        }
      }),
    ).then((entries) => {
      if (alive)
        setMeta((m) => ({ ...m, ...Object.fromEntries(entries) }));
    });
    return () => {
      alive = false;
    };
  }, [results]);

  const refresh = () => {
    setIndexing(true);
    ensureIndex(scope, prefs, true)
      .then(() => {
        setIndexing(false);
        setTick((t) => t + 1); // retrigger search effect
        showToast({ style: Toast.Style.Success, title: "Index rebuilt" });
      })
      .catch((e) => {
        setIndexing(false);
        showToast({
          style: Toast.Style.Failure,
          title: "Rebuild failed",
          message: String(e?.message || e),
        });
      });
  };

  const emptyTitle = indexing
    ? "Building index…"
    : query.trim().length < 2
      ? "Type to fuzzy-search files"
      : searching
        ? "Searching…"
        : "No matches";

  const customEmpty =
    scope === "custom" && scopePaths("custom", prefs).length === 0;
  const emptyDesc = indexing
    ? `Building your personal index — first run only.`
    : customEmpty
      ? "Set 'Custom Search Paths' in the command preferences first."
      : query.trim().length < 2
        ? "Every file on your Mac. No Spotlight needed."
        : "Nothing found — try a shorter term or ⌘R to refresh.";

  return (
    <List
      isLoading={indexing}
      throttle
      isShowingDetail={showDetail}
      searchText={query}
      onSearchTextChange={setQuery}
      navigationTitle="Find Everything"
      searchBarPlaceholder="Find every file on your Mac — instantly…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search scope"
          value={scope}
          onChange={(v) => setScope(v as Scope)}
          storeValue
        >
          <List.Dropdown.Item title="Home" value="home" icon={Icon.House} />
          <List.Dropdown.Item
            title="Downloads"
            value="downloads"
            icon={Icon.Download}
          />
          <List.Dropdown.Item
            title="Documents"
            value="documents"
            icon={Icon.Document}
          />
          <List.Dropdown.Item
            title="Applications"
            value="applications"
            icon={Icon.AppWindow}
          />
          <List.Dropdown.Item
            title="All (/)"
            value="all"
            icon={Icon.HardDrive}
          />
          <List.Dropdown.Item
            title="Custom paths"
            value="custom"
            icon={Icon.Folder}
          />
        </List.Dropdown>
      }
    >
      <List.EmptyView title={emptyTitle} description={emptyDesc} />
      {results.map((p) => {
        const m = meta[p];
        const accessories: List.Item.Accessory[] = [];
        if (m?.dir) accessories.push({ tag: "Folder" });
        if (m?.size !== undefined && !m?.dir)
          accessories.push({ text: humanBytes(m.size) });
        if (m?.gone) accessories.push({ tag: { value: "gone", color: "#888" } });
        const shownPath = prettyPath(p);
        const detailMd =
          isImage(p) && !m?.dir && !m?.gone
            ? `![](file://${encodeURI(p).replace(/#/g, "%23")})\n\n`
            : `**${path.basename(p)}**\n\n`;
        return (
          <List.Item
            key={p}
            icon={{ fileIcon: p }}
            title={path.basename(p)}
            subtitle={{ value: shownPath, tooltip: p }}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={detailMd}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Path"
                      text={p}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Size"
                      text={
                        m?.dir
                          ? "—"
                          : m?.size !== undefined
                            ? humanBytes(m.size)
                            : ""
                      }
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Modified"
                      text={m?.mtime ? m.mtime.toLocaleString() : ""}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text={
                        m?.dir
                          ? "Folder"
                          : path.extname(p).slice(1).toUpperCase() || "File"
                      }
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Open title="Open" target={p} />
                  <Action.ShowInFinder path={p} />
                  <Action
                    title="Open in Terminal"
                    icon={Icon.Terminal}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() =>
                      execFile("open", [
                        "-a",
                        "Terminal",
                        m?.dir ? p : path.dirname(p),
                      ])
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={p}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy File Name"
                    content={path.basename(p)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Copy File"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                    onAction={() => Clipboard.copy({ file: p })}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Toggle Preview"
                    icon={Icon.AppWindowSidebarRight}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setShowDetail((v) => !v)}
                  />
                  <Action
                    title="Rebuild Index"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refresh}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
