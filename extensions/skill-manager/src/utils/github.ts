import { promises as fs } from "fs";
import { execFile } from "child_process";
import { tmpdir } from "os";
import path from "path";
import fetch from "node-fetch";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";
import { copySkillFolder, ensureCentralSkillsFolder, getCentralSkillsPath } from "./central-skills";

interface Preferences {
  githubToken?: string;
}
interface GitHubRepoMetadata {
  description?: string;
  language?: string;
  forks_count?: number;
  stargazers_count?: number;
  default_branch?: string;
  html_url?: string;
  full_name?: string;
}

interface GitHubRepoReference {
  owner: string;
  repo: string;
  branch?: string;
}

interface GitHubFileResponse {
  content: string;
  encoding: string;
  name: string;
}

const execFileAsync = promisify(execFile);

function normalizeRepoRef(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\.git$/, "");
}

function sanitizeSkillFolderName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/^\.+/, "")
      .slice(0, 80) || "github-repo-skill"
  );
}

function describeRepositorySource(parsed: GitHubRepoReference): string {
  return `${parsed.owner}/${parsed.repo}${parsed.branch ? `@${parsed.branch}` : ""}`;
}

function escapeYamlDoubleQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function renderRepoSkillMarkdown(
  parsed: GitHubRepoReference,
  metadata: GitHubRepoMetadata | undefined,
  sourceSummary: string,
  topLevelItems: string[],
  skillTitle: string,
  includeAutoTags: boolean,
  warnings: string[],
): string {
  const tags = ["github", "repository", metadata?.language ? metadata.language.toLowerCase() : null].filter(
    Boolean,
  ) as string[];
  const description =
    metadata?.description ||
    `Skill generated from repository ${parsed.owner}/${parsed.repo}. Use this when working with this codebase.`;

  const lines: string[] = [];
  lines.push("---");
  lines.push(`name: "${escapeYamlDoubleQuoted(skillTitle)}"`);
  lines.push(`description: "${escapeYamlDoubleQuoted(description)}"`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${skillTitle}`);
  if (includeAutoTags && tags.length > 0) {
    lines.push("");
    lines.push(`[tags: ${tags.join(", ")}]`);
  }
  lines.push("");
  lines.push(description);
  lines.push("");
  lines.push("## When to use");
  lines.push(`- Use when the task is about the repository \`${parsed.owner}/${parsed.repo}\`.`);
  lines.push("- Consult `references/repository/` for repository files imported by opensrc.");
  lines.push("- Keep this skill as the canonical context for this repository.");
  lines.push("");
  lines.push("## Repository");
  lines.push(`- Source: https://github.com/${parsed.owner}/${parsed.repo}`);
  lines.push(`- Source reference: \`${describeRepositorySource(parsed)}\``);
  lines.push(`- Default branch: ${metadata?.default_branch ?? parsed.branch ?? "main"}`);
  if (metadata?.language) {
    lines.push(`- Primary language: ${metadata.language}`);
  }
  if (metadata?.stargazers_count !== undefined) {
    lines.push(`- Stars: ${metadata.stargazers_count}`);
  }
  if (metadata?.forks_count !== undefined) {
    lines.push(`- Forks: ${metadata.forks_count}`);
  }
  lines.push("");
  lines.push("## Overview");
  if (sourceSummary) {
    lines.push(sourceSummary);
  } else {
    lines.push("No README.md file was found in the repository snapshot.");
  }
  lines.push("");
  lines.push("## Top-level Layout");
  for (const item of topLevelItems) {
    lines.push(`- ${item}`);
  }
  if (warnings.length > 0) {
    lines.push("");
    lines.push("## Import Notes");
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join("\n");
}

function selectTopLevelItems(entries: Array<{ name: string }>): string[] {
  return entries
    .filter((entry) => !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 40);
}

async function directoryExists(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function listSubdirectories(targetPath: string): Promise<string[]> {
  if (!(await directoryExists(targetPath))) {
    return [];
  }
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(targetPath, entry.name));
}

async function findOpenSrcSourcePath(workingDir: string, parsed: GitHubRepoReference): Promise<string> {
  const owner = parsed.owner;
  const repo = parsed.repo;
  const fixedCandidates = [
    path.join(workingDir, "opensrc", "repos", "github.com", owner, repo),
    path.join(workingDir, "repos", "github.com", owner, repo),
    path.join(workingDir, "opensrc", `${owner}--${repo}`),
    path.join(workingDir, "opensrc", `${owner}-${repo}`),
    path.join(workingDir, "opensrc", repo),
    path.join(workingDir, `${owner}--${repo}`),
    path.join(workingDir, `${owner}-${repo}`),
    path.join(workingDir, repo),
  ];

  for (const candidate of fixedCandidates) {
    if (await directoryExists(candidate)) {
      return candidate;
    }
  }

  // Fallback: inspect the tree and prefer an exact <owner>/<repo> directory match.
  const queue: Array<{ dir: string; depth: number }> = [
    { dir: workingDir, depth: 0 },
    { dir: path.join(workingDir, "opensrc"), depth: 1 },
  ];
  const seen = new Set<string>();
  const repoLower = repo.toLowerCase();
  const ownerLower = owner.toLowerCase();
  const maxDepth = 8;
  let bestMatch: { fullPath: string; depth: number; score: number } | undefined;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current.dir) || !(await directoryExists(current.dir))) {
      continue;
    }
    seen.add(current.dir);
    if (current.depth > maxDepth) {
      continue;
    }

    const children = await listSubdirectories(current.dir);
    for (const child of children) {
      const childDepth = current.depth + 1;
      queue.push({ dir: child, depth: childDepth });

      const base = path.basename(child).toLowerCase();
      const parent = path.basename(path.dirname(child)).toLowerCase();
      const normalizedFull = child.toLowerCase();
      let score = 0;

      if (base === repoLower && parent === ownerLower) {
        return child;
      }

      if (base === repoLower) {
        score += 100;
      } else if (base.includes(repoLower)) {
        score += 35;
      }
      if (parent === ownerLower) {
        score += 30;
      } else if (normalizedFull.includes(`${path.sep}${ownerLower}${path.sep}`)) {
        score += 10;
      }
      if (normalizedFull.includes(`${path.sep}repos${path.sep}github.com${path.sep}`)) {
        score += 15;
      }
      score -= childDepth;

      if (
        score > 0 &&
        (!bestMatch || score > bestMatch.score || (score === bestMatch.score && childDepth < bestMatch.depth))
      ) {
        bestMatch = { fullPath: child, depth: childDepth, score };
      }
    }
  }

  if (bestMatch) {
    return bestMatch.fullPath;
  }

  const openSrcChildren = await listSubdirectories(path.join(workingDir, "opensrc"));
  if (openSrcChildren.length === 1) {
    return openSrcChildren[0];
  }

  throw new Error(`Could not locate opensrc output folder under ${workingDir}`);
}

/**
 * Parse a GitHub repository reference.
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/tree/branch/path
 * - github:owner/repo
 * - owner/repo
 * - owner/repo@branch
 */
export function parseGitHubRepoUrl(input: string): GitHubRepoReference | null {
  const trimmed = normalizeRepoRef(input);
  if (!trimmed) {
    return null;
  }

  const raw = trimmed.startsWith("github:") ? trimmed.replace(/^github:/, "") : trimmed;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);
      if (parsed.hostname !== "github.com") {
        return null;
      }
      const parts = parsed.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
      if (parts.length < 2) {
        return null;
      }
      if (parts.length > 2 && !["tree", "blob"].includes(parts[2])) {
        return null;
      }

      const owner = parts[0];
      const repo = parts[1];
      const branch = parts[2] === "tree" || parts[2] === "blob" ? parts[3] : undefined;

      if (!owner || !repo) {
        return null;
      }

      return { owner, repo, branch };
    } catch {
      return null;
    }
  }

  const match = raw.match(/^([^/\s]+)\/([^/\s@#]+)(?:[@#]([^/\s]+))?$/);
  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2],
    branch: match[3],
  };
}

async function fetchGitHubRepoMetadata(owner: string, repo: string): Promise<GitHubRepoMetadata> {
  const { githubToken } = getPreferenceValues<Preferences>();
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Raycast-Skill-Manager",
  };

  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`);
    }
    if (response.status === 403) {
      throw new Error("Rate limit exceeded or access denied. Consider adding a GitHub token.");
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  return (await response.json()) as GitHubRepoMetadata;
}

async function runOpenSrcAndLocateSource(parsed: GitHubRepoReference): Promise<{
  workingDir: string;
  sourcePath: string;
}> {
  const workingDir = await fs.mkdtemp(path.join(tmpdir(), "opensrc-repo-"));
  const repoRef = `${parsed.owner}/${parsed.repo}${parsed.branch ? `@${parsed.branch}` : ""}`;

  const formatExecError = (err: unknown): string => {
    if (typeof err !== "object" || err === null) {
      return String(err);
    }
    const maybeExecError = err as {
      message?: string;
      stderr?: string;
      stdout?: string;
      code?: string | number;
    };
    const details = [
      maybeExecError.message,
      maybeExecError.code ? `code=${maybeExecError.code}` : undefined,
      maybeExecError.stderr?.trim() || undefined,
      maybeExecError.stdout?.trim() || undefined,
    ].filter(Boolean);
    return details.join(" | ");
  };

  const attempts: Array<() => Promise<unknown>> = [
    () => execFileAsync("npx", ["--yes", "opensrc", repoRef, "--modify=false"], { cwd: workingDir }),
    () => execFileAsync("npm", ["exec", "--yes", "opensrc", "--", repoRef, "--modify=false"], { cwd: workingDir }),
    () => execFileAsync("/bin/zsh", ["-lc", `npx --yes opensrc ${repoRef} --modify=false`], { cwd: workingDir }),
  ];

  let lastError: unknown;
  try {
    let succeeded = false;
    for (const attempt of attempts) {
      try {
        await attempt();
        succeeded = true;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!succeeded) {
      throw new Error(formatExecError(lastError));
    }
  } catch (err) {
    await fs.rm(workingDir, { recursive: true, force: true });
    throw new Error(
      `Failed to run opensrc for ${repoRef}. Tried npx, npm exec and shell fallback. ${formatExecError(err)}`,
    );
  }

  const sourcePath = await findOpenSrcSourcePath(workingDir, parsed);
  return { workingDir, sourcePath };
}

async function readRepositoryOverview(sourcePath: string): Promise<string> {
  const candidates = ["README.md", "Readme.md", "readme.md", "README.txt", "readme.txt"];
  for (const candidate of candidates) {
    try {
      const content = await fs.readFile(path.join(sourcePath, candidate), "utf8");
      return content.split("\n").slice(0, 60).join("\n").trim().split("\n").slice(0, 30).join("\n").trim();
    } catch {
      // Try next file
    }
  }
  return "";
}

/**
 * Parse GitHub URL to extract owner, repo, and path
 * Supports formats:
 * - https://github.com/owner/repo/blob/branch/path/to/SKILL.md
 * - https://github.com/owner/repo/tree/branch/path/to/folder
 * - owner/repo/path/to/SKILL.md
 */
export function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
  path: string;
  branch?: string;
} | null {
  // Remove trailing slashes
  url = url.replace(/\/+$/, "");

  // Match full GitHub URL
  const fullUrlMatch = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/([^/]+)\/(.+)$/);
  if (fullUrlMatch) {
    return {
      owner: fullUrlMatch[1],
      repo: fullUrlMatch[2],
      branch: fullUrlMatch[3],
      path: fullUrlMatch[4],
    };
  }

  // Match short format: owner/repo/path
  const shortMatch = url.match(/^([^/]+)\/([^/]+)\/(.+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      path: shortMatch[3],
      branch: "main",
    };
  }

  return null;
}

/**
 * Import a GitHub repository as a full skill folder in the central skills path.
 * The repository is first fetched via opensrc.
 */
export async function importGitHubRepoAsSkill(
  url: string,
  skillNameOverride?: string,
  includeAutoTags = false,
): Promise<string> {
  const parsed = parseGitHubRepoUrl(url);
  if (!parsed) {
    throw new Error("Invalid GitHub repository format. Use github:owner/repo or a GitHub repo URL.");
  }

  await ensureCentralSkillsFolder();

  const sourceMetadata = await fetchGitHubRepoMetadata(parsed.owner, parsed.repo);
  const skillTitle = (skillNameOverride || parsed.repo).trim();
  const normalizedSkillName = sanitizeSkillFolderName(skillTitle);
  const destPath = path.join(getCentralSkillsPath(), normalizedSkillName);
  const repoSnapshotPath = path.join(destPath, "references", "repository");
  const warnings: string[] = [];

  // Ensure destination doesn't already exist
  try {
    await fs.access(destPath);
    throw new Error(`Skill "${normalizedSkillName}" already exists in central folder.`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  await fs.mkdir(destPath, { recursive: true });

  let sourceSummary = "";
  let topLevelItems: string[] = [];
  let opened:
    | {
        workingDir: string;
        sourcePath: string;
      }
    | undefined;

  try {
    opened = await runOpenSrcAndLocateSource(parsed);
    try {
      await copySkillFolder(opened.sourcePath, repoSnapshotPath);
    } catch (err) {
      warnings.push(`Repository snapshot copy had partial failures: ${String(err)}`);
    }
    const entries = await fs.readdir(opened.sourcePath, { withFileTypes: true });
    topLevelItems = selectTopLevelItems(entries);
    sourceSummary = await readRepositoryOverview(opened.sourcePath);
  } catch (err) {
    warnings.push(`opensrc snapshot not available: ${String(err)}`);
  } finally {
    if (opened) {
      await fs.rm(opened.workingDir, { recursive: true, force: true });
    }
  }

  const skillMarkdown = renderRepoSkillMarkdown(
    parsed,
    sourceMetadata,
    sourceSummary,
    topLevelItems,
    skillTitle,
    includeAutoTags,
    warnings,
  );
  await fs.writeFile(path.join(destPath, "SKILL.md"), skillMarkdown, "utf8");

  return skillTitle;
}

/**
 * Fetch file content from GitHub
 */
async function fetchGitHubFile(owner: string, repo: string, filePath: string, branch = "main"): Promise<string> {
  const { githubToken } = getPreferenceValues<Preferences>();

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Raycast-Skill-Manager",
  };

  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const response = await fetch(apiUrl, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File not found: ${filePath}`);
    }
    if (response.status === 403) {
      throw new Error("Rate limit exceeded or access denied. Consider adding a GitHub token.");
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = (await response.json()) as GitHubFileResponse;

  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf8");
  }

  return data.content;
}

/**
 * Fetch directory contents from GitHub
 */
async function fetchGitHubDirectory(
  owner: string,
  repo: string,
  dirPath: string,
  branch = "main",
): Promise<Array<{ name: string; path: string; type: string }>> {
  const { githubToken } = getPreferenceValues<Preferences>();

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Raycast-Skill-Manager",
  };

  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const response = await fetch(apiUrl, { headers });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  return (await response.json()) as Array<{ name: string; path: string; type: string }>;
}

/**
 * Download a skill folder from GitHub
 */
async function downloadSkillFolder(
  owner: string,
  repo: string,
  folderPath: string,
  localPath: string,
  branch = "main",
): Promise<void> {
  await fs.mkdir(localPath, { recursive: true });

  const contents = await fetchGitHubDirectory(owner, repo, folderPath, branch);

  for (const item of contents) {
    const localItemPath = path.join(localPath, item.name);

    if (item.type === "file") {
      const content = await fetchGitHubFile(owner, repo, item.path, branch);
      await fs.writeFile(localItemPath, content, "utf8");
    } else if (item.type === "dir") {
      await downloadSkillFolder(owner, repo, item.path, localItemPath, branch);
    }
  }
}

/**
 * Import a skill from GitHub URL
 * Returns the skill name that was imported
 */
export async function importSkillFromGitHub(url: string): Promise<string> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error("Invalid GitHub URL format");
  }

  const { owner, repo, path: githubPath, branch = "main" } = parsed;

  // Determine if this is a SKILL.md file or a folder
  const isFile = githubPath.endsWith(".md");

  let skillName: string;
  let content: string | undefined;

  if (isFile) {
    // Single file import
    content = await fetchGitHubFile(owner, repo, githubPath, branch);

    // Extract skill name from path
    const parts = githubPath.split("/");
    skillName = parts[parts.length - 2] || path.basename(githubPath, ".md");
  } else {
    // Folder import
    skillName = path.basename(githubPath);

    // Check if SKILL.md exists in the folder
    try {
      const skillMdPath = `${githubPath}/SKILL.md`;
      await fetchGitHubFile(owner, repo, skillMdPath, branch);
    } catch {
      throw new Error("No SKILL.md found in the specified folder");
    }
  }

  // Create destination folder
  const centralPath = getCentralSkillsPath();
  const destPath = path.join(centralPath, skillName);

  // Check if skill already exists
  try {
    await fs.access(destPath);
    throw new Error(`Skill "${skillName}" already exists. Delete it first to re-import.`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  if (isFile && content) {
    // Create folder and save SKILL.md
    await fs.mkdir(destPath, { recursive: true });
    await fs.writeFile(path.join(destPath, "SKILL.md"), content, "utf8");
  } else {
    // Download entire folder
    await downloadSkillFolder(owner, repo, githubPath, destPath, branch);
  }

  return skillName;
}
