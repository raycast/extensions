import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Expands a leading `~` to the current user's home directory.
 */
export function expandTilde(p: string): string {
    if (p === "~") {
        return homedir();
    }
    if (p.startsWith("~/")) {
        return join(homedir(), p.slice(2));
    }
    return p;
}

/**
 * oh-shoot is an app-sandboxed macOS app, so its data lives inside the app's
 * sandbox container (or the iCloud container when sync is on) rather than the
 * bare `~/Library/Application Support`. The bundle id has shifted over time
 * (`com.kairosable.oh-shoot` → `tech.kairosable.oh-shoot`) and the iCloud
 * container still uses the original `com` identifier, so we probe every known
 * candidate location and pick the one that actually holds data.
 */
const BUNDLE_IDS = ["tech.kairosable.oh-shoot", "com.kairosable.oh-shoot"];

/** App Support subpath inside a given sandbox container. */
function containerAppSupport(bundleId: string): string {
    return expandTilde(`~/Library/Containers/${bundleId}/Data/Library/Application Support/oh-shoot`);
}

/** Candidate directories that may contain `text-index.db`. */
function indexDbCandidates(): string[] {
    return [
        ...BUNDLE_IDS.map((id) => join(containerAppSupport(id), "text-index.db")),
        expandTilde("~/Library/Application Support/oh-shoot/text-index.db"),
    ];
}

/** Candidate `captures/` directories (iCloud first, then sandbox/local). */
function capturesCandidates(): string[] {
    const icloud = ["com", "tech"].map((p) =>
        expandTilde(`~/Library/Mobile Documents/iCloud~${p}~kairosable~oh-shoot/Documents/captures`),
    );
    const containers = BUNDLE_IDS.map((id) => join(containerAppSupport(id), "captures"));
    const bare = expandTilde("~/Library/Application Support/oh-shoot/captures");
    return [...icloud, ...containers, bare];
}

function mtimeOrZero(p: string): number {
    try {
        return statSync(p).mtimeMs;
    } catch {
        return 0;
    }
}

function hasSidecar(dir: string): boolean {
    try {
        return readdirSync(dir).some((name) => name.endsWith(".json"));
    } catch {
        return false;
    }
}

/**
 * The OCR index SQLite database. Returns the most-recently-modified existing
 * candidate, or `undefined` if none exist. Intentionally not memoized: the
 * candidate set is small (3 existsSync calls) and we want callers to notice
 * when the DB appears mid-session.
 */
export function resolveIndexDbPath(): string | undefined {
    const existing = indexDbCandidates().filter((p) => existsSync(p));
    if (existing.length === 0) {
        return undefined;
    }
    return existing.sort((a, b) => mtimeOrZero(b) - mtimeOrZero(a))[0];
}

let cachedCapturesDir: string | undefined;

/**
 * Resolves the captures directory. Prefers a candidate that actually contains
 * capture sidecars (handles iCloud sync, where the local container's `captures/`
 * exists but is empty); otherwise the first that exists; else the iCloud path.
 *
 * Memoized for the lifetime of the command: the sidecar-presence probe does a
 * `readdirSync` on each candidate (slow on iCloud) and runs on every keystroke
 * via `toCaptures`. Newly-appearing iCloud directories won't be picked up until
 * the command is relaunched — an acceptable tradeoff.
 */
export function getCapturesDir(): string {
    if (cachedCapturesDir !== undefined) {
        return cachedCapturesDir;
    }
    const candidates = capturesCandidates();
    cachedCapturesDir =
        candidates.find((dir) => existsSync(dir) && hasSidecar(dir)) ??
        candidates.find((dir) => existsSync(dir)) ??
        candidates[0];
    return cachedCapturesDir;
}

/** Whether the oh-shoot OCR index database is present on disk. */
export function isIndexDbAvailable(): boolean {
    return resolveIndexDbPath() !== undefined;
}
