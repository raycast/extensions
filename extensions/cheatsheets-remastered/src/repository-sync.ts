import axios from "axios";
import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";
import type { RepositoryCheatsheet, UserRepository } from "./models";
import { repositorySheetId } from "./identity";
import { stripFrontmatter } from "./markdown";

export class SyncCancelledError extends Error {
  constructor() {
    super("Sync canceled. Check saved content before retrying.");
    this.name = "SyncCancelledError";
  }
}

export const SYNC_LIMITS = { files: 300, fileBytes: 1024 * 1024, totalBytes: 20 * 1024 * 1024, timeoutMs: 120000 };
export type GetJSON = (
  url: string,
  options: { signal: AbortSignal; token?: string; maxBytes: number },
) => Promise<unknown>;
export const githubGet: GetJSON = async (url, { signal, token, maxBytes }) => {
  try {
    const response = await axios.get<unknown>(url, {
      signal,
      timeout: 15000,
      maxContentLength: maxBytes,
      maxRedirects: 0,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return response.data;
  } catch (error) {
    // Never propagate Axios errors: they contain headers, tokens and response bodies.
    if (signal.aborted || axios.isCancel(error))
      throw new Error("Sync canceled or timed out. Previous snapshot retained.");
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401)
        throw new Error("GitHub authentication failed. Reconnect GitHub and check repository access.");
      if (status === 403 || status === 429)
        throw new Error(
          "GitHub denied access or rate limited this request. Check repository permissions and retry later.",
        );
      if (status === 404)
        throw new Error(
          "Repository or branch not found, or access is unavailable. Check owner, name, branch and credentials.",
        );
      if (status === 409) throw new Error("GitHub has no commit to sync. Previous snapshot retained.");
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
        throw new Error("GitHub request timed out. Retry when the connection is stable.");
    }
    throw new Error(
      "GitHub request failed or exceeded the response limit. Check your connection and repository size, then retry.",
    );
  }
};
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function sha(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
}
export function normaliseSubdirectory(value = ""): string {
  const dir = value.trim().replace(/^\/+|\/+$/g, "");
  if (dir && dir.split("/").some((part) => !part || part === "." || part === ".." || part.includes("\\"))) {
    throw new Error("Use a repository-relative subdirectory with forward slashes and no dot segments.");
  }
  return dir;
}
export function includeRepositoryFile(filePath: string, subdirectory = ""): boolean {
  if (!/\.md$/i.test(filePath) || (subdirectory && !filePath.startsWith(`${subdirectory}/`))) return false;
  if (filePath.startsWith(".github/") || /(^|\/)_[^/]+/.test(filePath) || filePath.includes("@")) return false;
  if (/(?:code[_-]of[_-]conduct|pull_request_template)\.md$/i.test(filePath)) return false;
  return !/^(?:README|CONTRIBUTING|index|index@2016|LICENSE|LICENCE|CHANGELOG|HISTORY|SECURITY|RELEASES?|RELEASE[_-]NOTES?|AUTHORS?|CONTRIBUTORS?|ROADMAP|ROAD[_-]MAP|TODO|TASKS?|INSTALL|INSTALLATION|GETTING[_-]STARTED|QUICK[_-]START|IndexASVS|IndexMASVS|IndexProactiveControls|IndexTopTen|Preface|HelpGuide|Project\.[^/]+)\.md$/i.test(
    filePath,
  );
}
export interface StagedSnapshot {
  sheets: RepositoryCheatsheet[];
  revision: string;
  syncedAt: number;
}
export async function stageRepository(
  repo: UserRepository,
  token?: string,
  signal?: AbortSignal,
  get: GetJSON = githubGet,
): Promise<StagedSnapshot> {
  if (!/^[\w.-]+$/.test(repo.owner) || !/^[\w.-]+$/.test(repo.name) || !repo.defaultBranch.trim())
    throw new Error("Check the repository owner, name and branch.");
  const boundedSignal = AbortSignal.any([AbortSignal.timeout(SYNC_LIMITS.timeoutMs), ...(signal ? [signal] : [])]);
  const base = `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
  const request = async (suffix: string, maxBytes = 8 * 1024 * 1024) => {
    boundedSignal.throwIfAborted();
    const result = await get(`${base}/${suffix}`, { token, signal: boundedSignal, maxBytes });
    boundedSignal.throwIfAborted();
    return result;
  };
  const commit = await request(`commits/${encodeURIComponent(repo.defaultBranch)}`);
  if (
    !record(commit) ||
    !sha(commit.sha) ||
    !record(commit.commit) ||
    !record(commit.commit.tree) ||
    !sha(commit.commit.tree.sha)
  )
    throw new Error("GitHub returned an invalid commit. Previous snapshot retained.");
  const tree = await request(`git/trees/${commit.commit.tree.sha}?recursive=1`);
  if (!record(tree) || tree.sha !== commit.commit.tree.sha || tree.truncated !== false || !Array.isArray(tree.tree)) {
    throw new Error(
      "GitHub returned an incomplete or truncated tree. Previous snapshot retained. Use a smaller repository.",
    );
  }
  const files: { path: string; sha: string; size: number }[] = [];
  const paths = new Set<string>();
  const subdirectory = normaliseSubdirectory(repo.subdirectory);
  let totalBytes = 0;
  for (const entry of tree.tree) {
    if (
      !record(entry) ||
      typeof entry.path !== "string" ||
      !["blob", "tree", "commit"].includes(String(entry.type)) ||
      !sha(entry.sha)
    )
      throw new Error("Invalid GitHub tree entry. Previous snapshot retained.");
    if (entry.path.split("/").some((p) => !p || p === "." || p === "..") || paths.has(entry.path))
      throw new Error("Invalid or duplicate GitHub path. Previous snapshot retained.");
    paths.add(entry.path);
    if (entry.type !== "blob" || !includeRepositoryFile(entry.path, subdirectory)) continue;
    if (entry.mode !== "100644" && entry.mode !== "100755") continue; // Never import symlink targets as Markdown.
    if (
      typeof entry.size !== "number" ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      entry.size > SYNC_LIMITS.fileBytes
    )
      throw new Error("A Markdown file exceeds the 1 MiB limit or has invalid size. Previous snapshot retained.");
    totalBytes += entry.size;
    files.push({ path: entry.path, sha: entry.sha, size: entry.size });
  }
  if (subdirectory && ![...paths].some((p) => p === subdirectory || p.startsWith(`${subdirectory}/`))) {
    throw new Error("Subdirectory not found at this revision. Previous snapshot retained; check the path and retry.");
  }
  if (files.length > SYNC_LIMITS.files || totalBytes > SYNC_LIMITS.totalBytes)
    throw new Error("Sync exceeds 300 files or 20 MiB. Narrow the subdirectory and retry; previous snapshot retained.");
  let syncedAt = Date.now();
  const sheets: RepositoryCheatsheet[] = [];
  // Sequential requests bound memory and avoid bursts/secondary rate limits.
  for (const file of files) {
    const blob = await request(`git/blobs/${file.sha}`, 2 * SYNC_LIMITS.fileBytes);
    if (
      !record(blob) ||
      blob.sha !== file.sha ||
      blob.encoding !== "base64" ||
      typeof blob.content !== "string" ||
      blob.size !== file.size
    )
      throw new Error("GitHub returned an invalid blob. Previous snapshot retained.");
    const base64 = blob.content.replace(/\s/g, "");
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))
      throw new Error("Invalid file encoding. Previous snapshot retained.");
    const bytes = Buffer.from(base64, "base64");
    const digest = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    if (bytes.length !== file.size || digest !== file.sha)
      throw new Error("File integrity check failed. Previous snapshot retained.");
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      throw new Error("A Markdown file is not valid UTF-8. Previous snapshot retained.");
    }
    const title =
      /^ {0,3}#\s+(.+)$/m.exec(stripFrontmatter(content))?.[1]?.trim() ||
      file.path.split("/").pop()!.replace(/\.md$/i, "");
    sheets.push({
      id: repositorySheetId(repo, file.path),
      repositoryId: repo.id,
      slug: file.path.replace(/\.md$/i, ""),
      title,
      content,
      filePath: file.path,
      syncedAt,
      revision: commit.sha,
    });
  }
  boundedSignal.throwIfAborted();
  syncedAt = Date.now();
  for (const sheet of sheets) sheet.syncedAt = syncedAt;
  return { sheets, revision: commit.sha, syncedAt };
}
