import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getGithubToken } from "../preferences";
import { stripGitSuffix, type InstalledSkill, type SkillLockEntry } from "../shared";
import { listInstalledSkills } from "./skills-cli";

const LOCK_FILE = ".skill-lock.json";
const AGENTS_DIR = ".agents";

function getSkillLockPath(): string {
  const xdgStateHome = process.env.XDG_STATE_HOME;
  if (xdgStateHome) return join(xdgStateHome, "skills", LOCK_FILE);
  return join(homedir(), AGENTS_DIR, LOCK_FILE);
}

async function readSkillLock(): Promise<Record<string, SkillLockEntry>> {
  try {
    const raw = await readFile(getSkillLockPath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.skills === "object" && parsed.skills !== null) {
      return parsed.skills as Record<string, SkillLockEntry>;
    }
    return {};
  } catch {
    return {};
  }
}

export async function getInstalledSkillsWithLock(): Promise<InstalledSkill[]> {
  const [skills, lockEntries] = await Promise.all([listInstalledSkills(), readSkillLock()]);
  return skills.map((skill) => {
    const lock = lockEntries[skill.name];
    if (!lock) return skill;
    return {
      ...skill,
      source: lock.source,
      sourceUrl: lock.sourceUrl ? stripGitSuffix(lock.sourceUrl) : undefined,
      installedAt: lock.installedAt,
      updatedAt: lock.updatedAt,
    };
  });
}

interface GitHubTreeResponse {
  sha: string;
  tree: Array<{ path: string; sha: string; type: string }>;
  truncated?: boolean;
}

async function fetchRepoTree(source: string, token: string | undefined): Promise<GitHubTreeResponse | null> {
  const [owner, repo] = source.split("/");
  if (!owner || !repo) return null;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  for (const branch of ["main", "master"]) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
      headers,
    });
    if (res.ok) {
      const data = (await res.json()) as GitHubTreeResponse;
      if (data.truncated) return null;
      return data;
    }
    if (res.status === 403 || res.status === 429) return null;
  }
  return null;
}

/**
 * Implemented against the GitHub Trees API rather than `npx skills check` because
 * the CLI's check command reinstalls outdated skills as a side effect since v1.5.0.
 */
export async function checkForUpdates(): Promise<string[]> {
  const lock = await readSkillLock();
  const byRepo = new Map<string, Array<{ name: string; skillPath: string; expectedHash: string }>>();

  for (const [name, entry] of Object.entries(lock)) {
    if (entry.sourceType !== "github" || !entry.skillFolderHash || !entry.skillPath) continue;
    const list = byRepo.get(entry.source) ?? [];
    list.push({ name, skillPath: entry.skillPath, expectedHash: entry.skillFolderHash });
    byRepo.set(entry.source, list);
  }
  if (byRepo.size === 0) return [];

  const githubToken = getGithubToken();

  const results = await Promise.all(
    [...byRepo.entries()].map(async ([source, skills]) => {
      try {
        const tree = await fetchRepoTree(source, githubToken);
        if (!tree) return [];
        const { sha: rootSha, tree: entries } = tree;
        return skills.flatMap((skill) => {
          const folder = skill.skillPath.replace(/\/?SKILL\.md$/, "");
          const upstreamSha = folder ? entries.find((t) => t.path === folder && t.type === "tree")?.sha : rootSha;
          return upstreamSha && upstreamSha !== skill.expectedHash ? [skill.name] : [];
        });
      } catch {
        return [];
      }
    }),
  );
  return results.flat();
}
