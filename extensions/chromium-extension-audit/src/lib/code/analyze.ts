import { createHash } from "node:crypto";
import { constants, promises as fs } from "node:fs";
import path from "node:path";
import { canonical, hash, unique } from "../json";
import { CodeAnalysis, CodeSignal } from "../model";

// Hashing covers every file up to the byte budget; only pattern matching is limited per file.
export const CODE_LIMITS = { files: 20000, bytes: 1024 * 1024 * 1024, match: 16 * 1024 * 1024, hosts: 200 };
const SCRIPT = /\.(m?js|cjs)$/i;
const MARKUP = /\.html?$/i;
// Chrome writes _metadata itself; manifest.json changes are covered by the manifest integrity check.
const EXCLUDED = new Set(["_metadata", "manifest.json"]);
// Specification, documentation, and placeholder hosts that commonly appear in bundled libraries.
const IGNORED_HOSTS = new Set([
  "www.w3.org",
  "w3.org",
  "schema.org",
  "json-schema.org",
  "example.com",
  "www.example.com",
  "example.org",
  "localhost",
  "developer.mozilla.org",
  "reactjs.org",
  "react.dev",
  "fb.me",
  "github.com",
  "www.npmjs.com",
  "npms.io",
]);
const patterns: Record<CodeSignal["id"], RegExp> = {
  "remote-code":
    /importScripts\s*\(\s*["'`](?:https?:)?\/\/|\.src\s*=\s*["'`](?:https?:)?\/\/[^"'`]+\.m?js\b|<script[^>]+src\s*=\s*["'](?:https?:)?\/\//gi,
  obfuscation: /\b_0x[0-9a-f]{4,6}\b/gi,
  "dynamic-code": /\beval\s*\(|\bnew\s+Function\s*\(|\bset(?:Timeout|Interval)\s*\(\s*["'`]/g,
  // Consume each entire run once. A minimum-length quantifier retries at every
  // character of near-matches, stalling scans of large bundles.
  "encoded-payload": /[A-Za-z0-9+/]+={0,2}/g,
};
// javascript-obfuscator style identifiers appear hundreds of times; a few can occur by chance.
const OBFUSCATION_MIN = 50;
const HOST = /\b(?:https?|wss?):\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi;

function entropy(text: string): number {
  const counts = new Map<string, number>();
  for (const char of text) counts.set(char, (counts.get(char) ?? 0) + 1);
  let bits = 0;
  for (const count of counts.values()) bits -= (count / text.length) * Math.log2(count / text.length);
  return bits;
}
function signalCount(id: CodeSignal["id"], text: string): number {
  let count = 0;
  for (const match of text.matchAll(patterns[id])) {
    if (id === "encoded-payload") {
      const payload = match[0].replace(/=+$/, "");
      // Embedded images and fonts are data: URIs; only unexplained high-entropy runs count.
      if (
        payload.length < 4096 ||
        /data:[\w/+.-]*;base64,$/.test(text.slice(Math.max(0, match.index - 80), match.index)) ||
        entropy(match[0]) < 5.5
      )
        continue;
    }
    count++;
  }
  return id === "obfuscation" && count < OBFUSCATION_MIN ? 0 : count;
}
// A missing hash means the file could not be fully read within the remaining byte budget.
async function readRegular(
  file: string,
  keep: boolean,
  budget: number,
): Promise<{ hash?: string; size: number; content?: Buffer }> {
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error("File is not regular");
    if (stat.size > budget) return { size: 0 };
    const digest = createHash("sha256");
    const buffer = Buffer.alloc(Math.min(64 * 1024, budget));
    let contents: Buffer[] | undefined = keep && stat.size <= CODE_LIMITS.match ? [] : undefined;
    let size = 0;
    while (size < budget) {
      const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, budget - size), null);
      if (!bytesRead) break;
      const chunk = buffer.subarray(0, bytesRead);
      digest.update(chunk);
      size += bytesRead;
      if (size > CODE_LIMITS.match) contents = undefined;
      contents?.push(Buffer.from(chunk));
    }
    // Recheck at the boundary: a file can grow after the initial stat, even when initially small.
    if (size === budget && (await handle.stat()).size > size) return { size };
    return { hash: digest.digest("hex"), size, content: contents ? Buffer.concat(contents) : undefined };
  } finally {
    await handle.close();
  }
}

// Reads files inside one extension version folder. Files are hashed and pattern-matched, never executed.
export async function analyzeCode(root: string): Promise<CodeAnalysis> {
  const fileHashes: Record<string, string> = {};
  const signals = new Map<CodeSignal["id"], CodeSignal>();
  const hosts = new Set<string>();
  const limits: string[] = [];
  const skipped: string[] = [];
  let bytes = 0,
    files = 0;
  const pending = [""];
  walk: while (pending.length) {
    const relative = pending.pop()!;
    const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const name = path.posix.join(relative, entry.name);
      if (EXCLUDED.has(name)) continue;
      if (entry.isSymbolicLink()) {
        limits.push(`Symbolic link not followed: ${name}`);
        continue;
      }
      if (entry.isDirectory()) {
        pending.push(name);
        continue;
      }
      if (!entry.isFile()) continue;
      if (files >= CODE_LIMITS.files) {
        limits.push(`File limit of ${CODE_LIMITS.files} reached`);
        break walk;
      }
      const matchable = SCRIPT.test(name) || MARKUP.test(name);
      const file = await readRegular(path.join(root, name), matchable, CODE_LIMITS.bytes - bytes);
      bytes += file.size;
      if (!file.hash) {
        limits.push(`Size limit of ${CODE_LIMITS.bytes / 1024 / 1024} MB reached`);
        break walk;
      }
      fileHashes[name] = file.hash;
      files++;
      if (!matchable) continue;
      const content = file.content;
      if (!content) {
        skipped.push(`Patterns not checked in file over ${CODE_LIMITS.match / 1024 / 1024} MB: ${name}`);
        continue;
      }
      const text = content.toString("utf8");
      for (const id of Object.keys(patterns) as CodeSignal["id"][]) {
        if (MARKUP.test(name) && id !== "remote-code") continue;
        const count = signalCount(id, text);
        if (!count) continue;
        const signal = signals.get(id) ?? { id, count: 0, files: [] };
        signal.count += count;
        signal.files.push(name);
        signals.set(id, signal);
      }
      for (const match of text.matchAll(HOST)) {
        const host = match[1].toLowerCase();
        if (!IGNORED_HOSTS.has(host)) hosts.add(host);
      }
    }
  }
  const hostList = unique([...hosts]);
  if (hostList.length > CODE_LIMITS.hosts) skipped.push(`Only the first ${CODE_LIMITS.hosts} hosts are recorded`);
  return {
    // Skipped pattern checks are deterministic for the same files, so comparisons stay meaningful.
    complete: limits.length === 0,
    files,
    bytes,
    hash: hash(canonical(fileHashes)),
    fileHashes,
    hosts: hostList.slice(0, CODE_LIMITS.hosts),
    signals: [...signals.values()].map((signal) => ({ ...signal, files: signal.files.slice(0, 20) })),
    limits,
    skipped,
  };
}
