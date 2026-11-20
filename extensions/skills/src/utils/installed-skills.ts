import { getGithubToken } from "../preferences";
import type { InstalledSkill, SkillLockEntry } from "../shared";
import { listInstalledSkills } from "./skills-cli";
import { withSkillsCliLock } from "./skills-cli-runner";
import { readSkillLock, skillLockMetadata } from "./skill-lock";
import { isVerifiedCliSkill, safeMutableAgents } from "./skill-ownership";

export async function getInstalledSkillsWithLock(): Promise<InstalledSkill[]> {
  return (await getInstalledSkillsSnapshot()).skills;
}

async function getInstalledSkillsSnapshot(): Promise<{
  skills: InstalledSkill[];
  lockEntries: Record<string, SkillLockEntry>;
}> {
  return withSkillsCliLock(async (runLocked) => {
    const skills = await listInstalledSkills(runLocked);
    const lockEntries = await readSkillLock();
    return { skills: await mergeLockEntries(skills, lockEntries), lockEntries };
  });
}

async function mergeLockEntries(
  skills: InstalledSkill[],
  lockEntries: Record<string, SkillLockEntry>,
): Promise<InstalledSkill[]> {
  return Promise.all(
    skills.map(async (skill) => {
      const lock = lockEntries[skill.name];
      const verified = lock ? await isVerifiedCliSkill(skill, lock) : false;
      if (!lock || (!verified && lock.sourceType !== "local")) return { ...skill, managedBySkillsCli: false };
      return {
        ...skill,
        ...skillLockMetadata(lock),
        managedBySkillsCli: verified,
        mutableAgents: verified ? await safeMutableAgents(skill.name, skill.agents) : [],
      };
    }),
  );
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
async function checkForUpdates(lock: Record<string, SkillLockEntry>): Promise<string[]> {
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

export async function getInstalledSkillsWithUpdateStatus(): Promise<InstalledSkill[]> {
  const { skills, lockEntries } = await getInstalledSkillsSnapshot();
  const updatable = await checkForUpdates(lockEntries).catch((): string[] => []);
  const updatableSet = new Set(updatable);
  return skills.map((skill) => ({ ...skill, hasUpdate: skill.managedBySkillsCli && updatableSet.has(skill.name) }));
}
