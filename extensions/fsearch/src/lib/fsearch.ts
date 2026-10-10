import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getPreferenceValues } from "@raycast/api";

export type NameHit = {
  kind: "file" | "dir" | "link" | "other";
  path: string;
  size: number;
  mtime: Date;
};

export type ContentMatch = { line: number; text: string };

export type ContentFile = { path: string; matches: ContentMatch[] };

export type SearchResult =
  | { type: "names"; hits: NameHit[]; tookUs: number }
  | { type: "content"; files: ContentFile[]; tookUs: number; complete: boolean; indexing: boolean };

export class BinaryNotFoundError extends Error {
  constructor(readonly binaryPath: string) {
    super(`fsearch is not installed (expected at ${binaryPath}). Run the "Install fsearch" command in Raycast.`);
  }
}

export function resolveBinaryPath(): string {
  const { binaryPath } = getPreferenceValues<Preferences>();
  const configured = binaryPath?.trim();
  if (!configured) return join(homedir(), ".local", "bin", "fsearch");
  return configured.startsWith("~/") ? join(homedir(), configured.slice(2)) : configured;
}

/** Fields the daemon accepts: `q`, `limit`, `op`, `pattern`, `mode`, `per_file`, and any query filter (`ext`, `in`, …). */
export type FsearchRequest = Record<string, string | number>;

export function search({ query, limit, signal }: { query: string; limit: number; signal?: AbortSignal }) {
  return request({ q: query, limit }, signal);
}

/** Sends one request to the fsearch daemon through `fsearch stdio` and returns the first response line. */
export function request(payload: FsearchRequest, signal?: AbortSignal) {
  const binary = resolveBinaryPath();
  if (!existsSync(binary)) return Promise.reject(new BinaryNotFoundError(binary));

  return new Promise<SearchResult>((resolve, reject) => {
    const child = spawn(binary, ["stdio"], { signal });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      child.kill();
      fn();
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      const newline = stdout.indexOf("\n");
      if (newline === -1) return;
      const line = stdout.slice(0, newline);
      finish(() => {
        try {
          resolve(parseResponse(JSON.parse(line)));
        } catch (error) {
          reject(error);
        }
      });
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.on("error", (error) => finish(() => reject(error)));
    child.on("close", (code) =>
      finish(() => reject(new Error(stderr.trim() || `fsearch exited with code ${code} without a response`))),
    );

    child.stdin.end(JSON.stringify(payload) + "\n");
  });
}

function parseResponse(value: unknown): SearchResult {
  if (!isRecord(value)) throw new Error("Unexpected response from fsearch");
  if (value.ok !== true) {
    throw new Error(typeof value.error === "string" ? value.error : "fsearch returned an error");
  }
  const tookUs = typeof value.took_us === "number" ? value.took_us : 0;

  if (Array.isArray(value.hits)) {
    return { type: "names", tookUs, hits: value.hits.filter(isRecord).flatMap(parseHit) };
  }
  if (Array.isArray(value.files)) {
    return {
      type: "content",
      tookUs,
      complete: value.complete !== false,
      indexing: typeof value.indexing === "number" ? value.indexing > 0 : value.indexing === true,
      files: value.files.filter(isRecord).flatMap(parseFile),
    };
  }
  throw new Error("Unexpected response from fsearch");
}

function parseHit(hit: Record<string, unknown>): NameHit[] {
  if (typeof hit.path !== "string") return [];
  return [
    {
      path: hit.path,
      kind: isKind(hit.kind) ? hit.kind : "other",
      size: typeof hit.size === "number" ? hit.size : 0,
      mtime: new Date((typeof hit.mtime === "number" ? hit.mtime : 0) * 1000),
    },
  ];
}

function parseFile(file: Record<string, unknown>): ContentFile[] {
  if (typeof file.path !== "string") return [];
  const matches = Array.isArray(file.matches)
    ? file.matches
        .filter(isRecord)
        .flatMap((m) =>
          typeof m.line === "number" && typeof m.text === "string" ? [{ line: m.line, text: m.text }] : [],
        )
    : [];
  return [{ path: file.path, matches }];
}

function isKind(value: unknown): value is NameHit["kind"] {
  return value === "file" || value === "dir" || value === "link" || value === "other";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
