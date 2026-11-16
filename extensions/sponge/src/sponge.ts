import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { accessSync, constants, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, isAbsolute, join } from "node:path";

export const SETUP_URL = "https://sponge.computer/docs/agents";
export const INSTALL_COMMAND = "npm install --global @hraness/sponge";

export type Item = {
  itemId: string;
  title: string;
  kind?: string;
  revisionId?: string | null;
  createdAt?: string;
};

export type ItemDetail = {
  item: Item & { status?: string; markdown?: string };
  identity?: { uris?: { uri: string; role?: string; resolvable?: boolean }[] };
};

export class SpongeMissingError extends Error {
  constructor() {
    super("Sponge CLI not found");
  }
}

export class SpongeError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly hint?: string,
  ) {
    super(message);
  }
}

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function nvmCandidates(): string[] {
  const root = join(homedir(), ".nvm", "versions", "node");
  try {
    return readdirSync(root)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map((version) => join(root, version, "bin", "sponge"));
  } catch {
    return [];
  }
}

function findCli(): string {
  const { cliPath } = getPreferenceValues<Preferences>();
  if (cliPath) {
    if (isExecutable(cliPath)) return cliPath;
    throw new SpongeError("The Sponge CLI in preferences cannot be run", undefined, `Check the path: ${cliPath}`);
  }
  const home = homedir();
  const candidates = [
    "/opt/homebrew/bin/sponge",
    "/usr/local/bin/sponge",
    join(home, ".npm-global", "bin", "sponge"),
    join(home, ".volta", "bin", "sponge"),
    join(home, ".local", "bin", "sponge"),
    ...nvmCandidates(),
    ...(process.env.PATH ?? "")
      .split(delimiter)
      .filter(isAbsolute)
      .map((directory) => join(directory, "sponge")),
  ];
  const found = candidates.find(isExecutable);
  if (!found) throw new SpongeMissingError();
  return found;
}

function libraryArguments(): string[] {
  const { library } = getPreferenceValues<Preferences>();
  return library ? ["--library", library] : [];
}

type Envelope = { ok?: boolean; code?: string; reason?: string; hint?: string };

function failure(envelope: Envelope): SpongeError {
  const reason = envelope.reason ?? envelope.code ?? "error";
  return new SpongeError(`Sponge: ${reason.replace(/-/g, " ")}`, envelope.code, envelope.hint);
}

function parseEnvelope<T>(text: string): (Envelope & T) | undefined {
  try {
    const value = JSON.parse(text.trim());
    return value && typeof value === "object" ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Runs `sponge ARGS --json` and returns its parsed JSON result. Global flags go
 * before a `--` separator so user text after it is never read as a flag.
 */
export function runSponge<T>(args: string[], signal?: AbortSignal): Promise<T> {
  const cli = findCli();
  const separator = args.indexOf("--");
  const flags = ["--json", ...libraryArguments()];
  const argv =
    separator === -1 ? [...args, ...flags] : [...args.slice(0, separator), ...flags, ...args.slice(separator)];
  // The CLI is a Node.js script; put the folder that holds it (and its node) first on PATH.
  const path = [dirname(cli), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH ?? ""]
    .filter(Boolean)
    .join(delimiter);
  return new Promise((resolve, reject) => {
    execFile(
      cli,
      argv,
      { env: { ...process.env, PATH: path }, timeout: 30_000, maxBuffer: 16 * 1024 * 1024, signal },
      (error, stdout, stderr) => {
        const parsed = parseEnvelope<T>(stdout) ?? parseEnvelope<T>(stderr);
        if (parsed && parsed.ok === true) return resolve(parsed);
        if (parsed && parsed.ok === false) return reject(failure(parsed));
        if (error && (error as NodeJS.ErrnoException).code === "ENOENT") return reject(new SpongeMissingError());
        if (error?.name === "AbortError") return reject(error);
        const detail = stderr.trim().split("\n")[0] || error?.message || "Unexpected output";
        if (/env: node|node: No such file/i.test(detail)) {
          return reject(
            new SpongeError("Node.js not found", undefined, "Sponge needs Node.js 24.20 or later on PATH."),
          );
        }
        reject(new SpongeError("Sponge did not finish", undefined, detail));
      },
    );
  });
}

/**
 * Runs a read-only command, trying once more after a short pause if it fails
 * unexpectedly. Another Sponge command writing to the library at the same moment
 * can make a read fail; repeating a read changes nothing.
 */
async function readSponge<T>(args: string[], signal?: AbortSignal): Promise<T> {
  try {
    return await runSponge<T>(args, signal);
  } catch (error) {
    if (!(error instanceof SpongeError) || error.code !== "unclassified" || signal?.aborted) throw error;
    await new Promise((resolve) => setTimeout(resolve, 400));
    return runSponge<T>(args, signal);
  }
}

export async function searchLibrary(query: string, signal?: AbortSignal): Promise<Item[]> {
  const result = await readSponge<{ items: Item[] }>(
    ["search", "--mode", "lexical", "--limit", "30", "--", query],
    signal,
  );
  return result.items;
}

export async function listRecent(signal?: AbortSignal): Promise<Item[]> {
  const result = await readSponge<{ items: Item[] }>(["list", "--limit", "50"], signal);
  return result.items;
}

export function showItem(itemId: string, signal?: AbortSignal): Promise<ItemDetail> {
  return readSponge<ItemDetail>(["show", itemId], signal);
}

export function sourceUrl(detail: ItemDetail): string | undefined {
  const uris = detail.identity?.uris ?? [];
  const primary = uris.find((uri) => uri.role === "primary") ?? uris[0];
  return primary && /^https?:\/\//.test(primary.uri) ? primary.uri : undefined;
}

export function saveUrl(url: string): Promise<{ itemId: string; jobId?: string; duplicate?: boolean }> {
  return runSponge(["add", url]);
}

export function titleOf(item: Item): string {
  return item.title.trim() || "Untitled";
}

export function stripFrontMatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}
