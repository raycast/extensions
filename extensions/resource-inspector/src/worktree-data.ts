import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

import { cancellableIO } from "./cancellation";

const execute = promisify(execFile);
export interface WorktreeRecord {
  path: string;
  head: string;
  branch?: string;
  detached: boolean;
  bare: boolean;
  locked?: string;
  prunable?: string;
}
export interface Worktree extends WorktreeRecord {
  key: string;
  commonDir: string;
  repository: string;
  adminDir?: string;
  main: boolean;
  exists: boolean;
  createdAt: number | null;
  createdSource: string;
  provider: string;
  providerEvidence: string;
}
export interface WorktreeScan {
  trees: Worktree[];
  roots: string[];
  scannedDirectories: number;
  repositories: number;
  warnings: string[];
  partial: boolean;
  completedAt: number;
}
export interface WorktreeReview {
  tree: Worktree;
  fingerprint: string;
  tracked: number;
  untracked: number;
  ignored: number;
  changes: string[];
  blockedReason?: string;
  statusError?: string;
}
export async function gitAt(
  cwd: string,
  args: string[],
  timeout = 15000,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
    LC_ALL: "C",
  };
  for (const key of Object.keys(env)) {
    if (
      key.startsWith("GIT_") &&
      !["GIT_TERMINAL_PROMPT", "GIT_OPTIONAL_LOCKS"].includes(key)
    )
      delete (env as NodeJS.ProcessEnv)[key];
  }
  const pending = execute(
    "/usr/bin/git",
    [
      "--no-optional-locks",
      "-c",
      "core.fsmonitor=false",
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "maintenance.auto=false",
      "-c",
      "gc.auto=0",
      "-C",
      cwd,
      ...args,
    ],
    { env, timeout, maxBuffer: 16 * 1024 * 1024, signal },
  );
  // Abort rejects execFile before its child necessarily exits. Do not release the
  // serialized scan until Git has closed its process and stdio handles.
  const closed = new Promise<void>((resolve) =>
    pending.child.once("close", () => resolve()),
  );
  try {
    return (await pending).stdout;
  } finally {
    await closed;
    signal?.throwIfAborted();
  }
}
function oneLine(text: string) {
  return text.replace(/\n$/, "");
}
export function parseWorktreeList(text: string): WorktreeRecord[] {
  const rows: WorktreeRecord[] = [];
  let row: WorktreeRecord | undefined;
  for (const field of text.split("\0")) {
    if (field.startsWith("worktree ")) {
      if (row) rows.push(row);
      row = { path: field.slice(9), head: "", detached: false, bare: false };
    } else if (row) {
      if (field.startsWith("HEAD ")) row.head = field.slice(5);
      else if (field.startsWith("branch ")) row.branch = field.slice(7);
      else if (field === "detached") row.detached = true;
      else if (field === "bare") row.bare = true;
      else if (field === "locked" || field.startsWith("locked "))
        row.locked = field.slice(7) || "Locked by Git";
      else if (field === "prunable" || field.startsWith("prunable "))
        row.prunable = field.slice(9) || "Stale registration";
    }
  }
  if (row) rows.push(row);
  return rows;
}
export function providerHint(path: string): {
  provider: string;
  providerEvidence: string;
} {
  const p = path.replace(/\\/g, "/");
  if (/\/\.codex\/worktrees\//i.test(p))
    return {
      provider: "Codex / ChatGPT",
      providerEvidence: "Path is inside Codex's worktree storage",
    };
  if (/\/(\.claude\/worktrees|\.claude-worktrees)\//i.test(p))
    return {
      provider: "Claude",
      providerEvidence: "Path matches a Claude worktree folder",
    };
  if (/\/(\.pi(?:\/[^/]+)*\/worktrees|pi-worktrees)\//i.test(p))
    return {
      provider: "Pi",
      providerEvidence: "Path matches a Pi worktree folder",
    };
  if (
    /\/(?:\.local\/share\/opencode\/worktree|\.opencode\/worktrees?)\//i.test(p)
  )
    return {
      provider: "OpenCode",
      providerEvidence: "Path matches OpenCode's worktree storage",
    };
  return {
    provider: "Git / Other",
    providerEvidence: "Git does not record which provider created a worktree",
  };
}
export function defaultWorktreeRoots(home = homedir()) {
  return [
    home,
    join(home, ".codex/worktrees"),
    join(home, ".claude/worktrees"),
    join(home, ".pi"),
    join(home, ".local/share/opencode/worktree"),
    join(home, ".local/share/opencode/repos"),
    join(home, ".opencode"),
  ];
}
async function canonical(path: string, signal?: AbortSignal) {
  return cancellableIO(signal, () => realpath(path).catch(() => resolve(path)));
}
// Resolve parent aliases such as /var, but never hide a replaced symlink at the checkout itself.
async function checkoutPath(path: string, signal?: AbortSignal) {
  return join(await canonical(dirname(path), signal), basename(path));
}
async function smallText(path: string, signal?: AbortSignal): Promise<string> {
  const info = await cancellableIO(signal, () => lstat(path));
  if (!info.isFile() || info.isSymbolicLink() || info.size > 16384)
    throw new Error("Unexpected Git metadata file");
  return cancellableIO(signal, () =>
    readFile(path, { encoding: "utf8", signal }),
  );
}
async function commonDirectory(path: string, signal?: AbortSignal) {
  const common = oneLine(
    await gitAt(
      path,
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      15000,
      signal,
    ),
  );
  return cancellableIO(signal, () => realpath(common));
}
async function administrativePaths(commonDir: string, signal?: AbortSignal) {
  const result = new Map<string, string>();
  const root = join(commonDir, "worktrees");
  for (const entry of await cancellableIO(signal, () =>
    readdir(root, { withFileTypes: true }).catch(() => []),
  )) {
    signal?.throwIfAborted();
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const admin = join(root, entry.name);
    try {
      const pointer = oneLine(await smallText(join(admin, "gitdir"), signal));
      const marker = resolve(admin, pointer);
      if (basename(marker) !== ".git") continue;
      result.set(await checkoutPath(dirname(marker), signal), admin);
    } catch {
      signal?.throwIfAborted();
      /* Unreadable metadata cannot authorize deletion. */
    }
  }
  return result;
}
export async function listRepositoryWorktrees(
  commonDir: string,
  signal?: AbortSignal,
): Promise<Worktree[]> {
  commonDir = await cancellableIO(signal, () => realpath(commonDir));
  const records = parseWorktreeList(
    await gitAt(
      commonDir,
      ["worktree", "list", "--porcelain", "-z"],
      15000,
      signal,
    ),
  );
  const admins = await administrativePaths(commonDir, signal);
  const mainPath = records[0]?.path ?? dirname(commonDir);
  const repository = basename(mainPath).replace(/\.git$/, "");
  const result: Worktree[] = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index],
      path = await checkoutPath(record.path, signal),
      adminDir = admins.get(path);
    const info = await cancellableIO(signal, () =>
        lstat(path).catch(() => null),
      ),
      adminInfo = adminDir
        ? await cancellableIO(signal, () => lstat(adminDir).catch(() => null))
        : null;
    const creation =
      adminInfo?.birthtimeMs && adminInfo.birthtimeMs > 0
        ? adminInfo.birthtimeMs
        : info?.birthtimeMs && info.birthtimeMs > 0
          ? info.birthtimeMs
          : null;
    result.push({
      ...record,
      path,
      key: `${commonDir}\0${path}`,
      commonDir,
      repository,
      adminDir,
      main: index === 0 || record.bare,
      exists: !!info?.isDirectory(),
      createdAt: creation,
      createdSource:
        adminInfo?.birthtimeMs && adminInfo.birthtimeMs > 0
          ? "Git registration folder creation time (estimate; copying or restoring can change it)"
          : creation
            ? "Worktree folder creation time (estimate)"
            : "Creation time unavailable",
      ...providerHint(path),
    });
  }
  return result;
}
const excluded = new Set([
  ".git",
  "node_modules",
  "vendor",
  ".venv",
  "venv",
  "target",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".cache",
  ".Trash",
  ".npm",
  ".pnpm-store",
  ".yarn",
  ".turbo",
  ".codegraph",
  "__pycache__",
]);
const hiddenAllowed = new Set([
  ".worktrees",
  ".claude",
  ".pi",
  ".opencode",
  ".codex",
  ".git-worktrees",
]);
const homeExcluded = new Set([
  "Library",
  "Music",
  "Movies",
  "Pictures",
  "Applications",
  "OrbStack",
]);
export async function scanWorktrees(
  roots: string[],
  options: {
    signal?: AbortSignal;
    maxDirectories?: number;
    maxMilliseconds?: number;
    onProgress?: (directories: number, repositories: number) => void;
  } = {},
): Promise<WorktreeScan> {
  const queue: string[] = [],
    seen = new Set<string>(),
    repos = new Set<string>(),
    trees = new Map<string, Worktree>();
  const warnings: string[] = [],
    started = Date.now();
  let scannedDirectories = 0,
    partial = false;
  const signal = options.signal;
  signal?.throwIfAborted();
  const home = await canonical(homedir(), signal);
  const optionalRoots = new Set(defaultWorktreeRoots());
  for (const root of roots) {
    try {
      queue.push(await cancellableIO(signal, () => realpath(root)));
    } catch {
      signal?.throwIfAborted();
      if (!optionalRoots.has(root))
        warnings.push(`Scan folder is missing or unavailable: ${root}`);
    }
  }
  async function addRepository(path: string) {
    try {
      const common = await commonDirectory(path, signal);
      if (repos.has(common)) return;
      repos.add(common);
      for (const tree of await listRepositoryWorktrees(common, signal))
        trees.set(tree.key, tree);
    } catch (error) {
      signal?.throwIfAborted();
      warnings.push(
        `Could not inspect repository ${path}: ${error instanceof Error ? error.message.split("\n").slice(-2).join(" ") : String(error)}`,
      );
    }
  }
  for (let index = 0; index < queue.length; index++) {
    signal?.throwIfAborted();
    if (
      scannedDirectories >= (options.maxDirectories ?? 30000) ||
      Date.now() - started > (options.maxMilliseconds ?? 45000)
    ) {
      partial = true;
      break;
    }
    const dir = queue[index];
    if (seen.has(dir)) continue;
    seen.add(dir);
    scannedDirectories++;
    let entries;
    try {
      entries = await cancellableIO(signal, () =>
        readdir(dir, { withFileTypes: true }),
      );
    } catch {
      signal?.throwIfAborted();
      warnings.push(`Cannot read ${dir}`);
      continue;
    }
    if (
      entries.some((e) => e.name === ".git") ||
      (entries.some((e) => e.name === "HEAD" && e.isFile()) &&
        entries.some((e) => e.name === "objects" && e.isDirectory()) &&
        entries.some((e) => e.name === "refs" && e.isDirectory()))
    ) {
      await addRepository(dir);
      if (
        entries.some((e) => e.name === "objects") &&
        !entries.some((e) => e.name === ".git")
      )
        continue;
    }
    for (const entry of entries) {
      signal?.throwIfAborted();
      if (
        !entry.isDirectory() ||
        entry.isSymbolicLink() ||
        excluded.has(entry.name) ||
        (dir === home && homeExcluded.has(entry.name))
      )
        continue;
      if (entry.name.startsWith(".") && !hiddenAllowed.has(entry.name))
        continue;
      // Provider stores have dedicated roots; avoid unrelated caches and session transcripts at home.
      if (dir === home && entry.name.startsWith(".")) continue;
      queue.push(join(dir, entry.name));
    }
    if (scannedDirectories % 100 === 0)
      options.onProgress?.(scannedDirectories, repos.size);
  }
  signal?.throwIfAborted();
  return {
    trees: [...trees.values()],
    roots,
    scannedDirectories,
    repositories: repos.size,
    warnings,
    partial,
    completedAt: Date.now(),
  };
}
export function parseStatus(text: string) {
  let tracked = 0,
    untracked = 0,
    ignored = 0;
  const changes: string[] = [],
    fields = text.split("\0");
  for (let i = 0; i < fields.length; i++) {
    const entry = fields[i];
    if (!entry) continue;
    const code = entry.slice(0, 2),
      path = entry.slice(3);
    if (code === "??") untracked++;
    else if (code === "!!") ignored++;
    else tracked++;
    if (changes.length < 100) changes.push(`${code} ${path}`);
    if (code.includes("R") || code.includes("C")) i++;
  }
  return { tracked, untracked, ignored, changes };
}
function within(parent: string, child: string) {
  const rel = relative(parent, child);
  return (
    rel === "" ||
    (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))
  );
}
async function identity(tree: Worktree) {
  const root = await lstat(tree.path).catch(() => null);
  const admin = tree.adminDir
    ? await lstat(tree.adminDir).catch(() => null)
    : null;
  if (root?.isSymbolicLink() || admin?.isSymbolicLink())
    throw new Error("Symbolic-link worktree identities cannot be removed");
  if (
    !tree.adminDir ||
    !admin?.isDirectory() ||
    dirname(tree.adminDir) !== join(tree.commonDir, "worktrees")
  )
    throw new Error("Git registration identity could not be verified");
  const pointer = resolve(
    tree.adminDir,
    oneLine(await smallText(join(tree.adminDir, "gitdir"))),
  );
  if (
    (await canonical(dirname(pointer))) !== tree.path ||
    basename(pointer) !== ".git"
  )
    throw new Error("Git worktree registration has changed");
  if (root) {
    if (!root.isDirectory())
      throw new Error("Worktree path is no longer a directory");
    const marker = await smallText(join(tree.path, ".git"));
    if (!marker.startsWith("gitdir: "))
      throw new Error("Invalid linked-worktree marker");
    if (
      (await realpath(resolve(tree.path, oneLine(marker).slice(8)))) !==
      tree.adminDir
    )
      throw new Error("Worktree points to different Git metadata");
    if ((await commonDirectory(tree.path)) !== tree.commonDir)
      throw new Error("Repository identity has changed");
  }
  return {
    root: root ? `${root.dev}:${root.ino}:${root.birthtimeMs}` : "missing",
    admin: `${admin.dev}:${admin.ino}:${admin.birthtimeMs}`,
  };
}
export async function reviewWorktree(
  selected: Worktree,
): Promise<WorktreeReview> {
  const registry = await listRepositoryWorktrees(selected.commonDir);
  const tree = registry.find((t) => t.key === selected.key);
  if (!tree)
    throw new Error("This worktree is no longer registered. Rescan the list.");
  let blockedReason = tree.main
    ? "The main checkout or bare repository cannot be removed"
    : tree.locked
      ? `Worktree is locked: ${tree.locked}`
      : undefined;
  if (
    !blockedReason &&
    registry.some((t) => t.key !== tree.key && within(tree.path, t.path))
  )
    blockedReason = "Another registered worktree is inside this folder";
  if (!blockedReason && within(tree.path, tree.commonDir))
    blockedReason = "Shared repository metadata is inside this folder";
  let id: unknown;
  if (!blockedReason) {
    try {
      id = await identity(tree);
    } catch (e) {
      blockedReason = String(e instanceof Error ? e.message : e);
    }
  }
  let status = "",
    statusError: string | undefined;
  if (tree.exists) {
    try {
      status = await gitAt(tree.path, [
        "status",
        "--porcelain=v1",
        "-z",
        "--untracked-files=normal",
        "--ignored=matching",
        "--ignore-submodules=none",
      ]);
    } catch (e) {
      statusError = String(e instanceof Error ? e.message : e);
      blockedReason ??= "Cannot verify local changes; removal is unavailable";
    }
  }
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        id,
        path: tree.path,
        common: tree.commonDir,
        admin: tree.adminDir,
        head: tree.head,
        branch: tree.branch,
        locked: tree.locked,
        status,
      }),
    )
    .digest("hex");
  return {
    tree,
    fingerprint,
    ...parseStatus(status),
    blockedReason,
    statusError,
  };
}
export async function removeWorktree(
  review: WorktreeReview,
  discardChanges: boolean,
) {
  const fresh = await reviewWorktree(review.tree);
  if (fresh.blockedReason) throw new Error(fresh.blockedReason);
  if (fresh.fingerprint !== review.fingerprint)
    throw new Error(
      "Worktree or local changes changed since review. Refresh and confirm again.",
    );
  if ((fresh.tracked || fresh.untracked) && !discardChanges)
    throw new Error(
      "Local changes need the separate Delete Including Local Changes action",
    );
  let recoveryRef: string | undefined;
  if (fresh.tree.detached && /^[a-f0-9]{40,64}$/.test(fresh.tree.head)) {
    recoveryRef = `refs/resource-inspector/deleted-worktrees/${Date.now()}-${randomUUID().slice(0, 8)}`;
    await gitAt(fresh.tree.commonDir, [
      "update-ref",
      recoveryRef,
      fresh.tree.head,
      "",
    ]);
  }
  // Use Git's single-target operation. No recursive rm, branch deletion, unlocking, or bulk prune.
  await gitAt(
    fresh.tree.commonDir,
    [
      "worktree",
      "remove",
      ...(discardChanges ? ["--force"] : []),
      "--",
      fresh.tree.path,
    ],
    120000,
  );
  await verifyWorktreeRemoval(fresh.tree);
  return { recoveryRef };
}
export async function verifyWorktreeRemoval(tree: Worktree) {
  const remains = (await listRepositoryWorktrees(tree.commonDir)).some(
    (t) => t.key === tree.key,
  );
  if (remains)
    throw new Error(
      "Git still lists this worktree; rescan before trying again",
    );
  const folder = await lstat(tree.path).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw new Error(
        `Cannot verify whether the worktree folder was removed: ${error.message}`,
      );
    },
  );
  if (folder)
    throw new Error(
      `Git no longer registers this worktree, but its folder still exists: ${tree.path}. No further files were removed. Inspect the remaining folder manually.`,
    );
}
