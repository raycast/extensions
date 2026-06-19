import { withCache } from "@raycast/utils";

import { getGithubToken } from "../preferences";
import { type Skill, type SkillFrontmatter, parseFrontmatter } from "../shared";

type SkillContentResult = {
  frontmatter: SkillFrontmatter;
  body: string;
  raw: string;
};

type GitTreeEntry = {
  path: string;
  type: string;
  url?: string;
};

type SkillMdEntry = {
  path: string;
  url: string;
};

function parseSkillContent(text: string): SkillContentResult {
  return { ...parseFrontmatter(text), raw: text };
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  const token = getGithubToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Folder names a skill may live under, most specific first. skills.sh derives
 * `skillId`/`name` from the skill's folder name, so matching against the folder
 * that contains SKILL.md is reliable. The owner-prefix variant mirrors repos
 * that namespace skills as `owner-skillName`.
 */
function candidateSkillDirNames(skill: Skill): string[] {
  const owner = skill.source.split("/")[0] ?? "";
  const ownerPrefix = owner.split("-")[0] + "-";
  const skillIdWithoutPrefix = skill.skillId.startsWith(ownerPrefix)
    ? skill.skillId.slice(ownerPrefix.length)
    : skill.skillId;

  return [...new Set([skill.skillId, skillIdWithoutPrefix, skill.name].filter(Boolean))];
}

/**
 * Common flat layouts fetched straight from raw.githubusercontent so the
 * typical case costs no GitHub API quota. Skills nested under category folders
 * (e.g. `skills/productivity/grill-me/SKILL.md`) are resolved by the tree
 * lookup below instead.
 */
function buildFlatSkillUrls(skill: Skill): string[] {
  const paths = candidateSkillDirNames(skill).flatMap((dir) => [`skills/${dir}/SKILL.md`, `${dir}/SKILL.md`]);
  const branches = ["main", "master"];

  return branches.flatMap((branch) =>
    paths.map((path) => `https://raw.githubusercontent.com/${skill.source}/${branch}/${path}`),
  );
}

async function fetchRawSkillMd(url: string): Promise<SkillContentResult> {
  const response = await fetch(url);
  if (response.ok && !response.headers.get("content-type")?.includes("text/html")) {
    return parseSkillContent(await response.text());
  }
  throw new Error(`Failed to fetch ${url}`);
}

/**
 * Every SKILL.md path in a repo, keyed by source and cached so browsing several
 * skills from the same repository (or copying contents repeatedly) reuses a
 * single tree request instead of re-downloading it each time. Throws on failure
 * so a rate-limited or failed request is retried rather than cached as "no
 * skills". Uses the GitHub API (with the optional token) so it shares the same
 * rate-limit budget as the repo stats.
 */
const fetchRepoSkillMdEntries = withCache(
  async (source: string): Promise<SkillMdEntry[]> => {
    const response = await fetch(`https://api.github.com/repos/${source}/git/trees/HEAD?recursive=1`, {
      headers: githubHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch tree for ${source}: ${response.status}`);
    }

    // For very large repos (>100k git objects) GitHub returns a truncated,
    // partial tree, so a deeply nested SKILL.md could be missed. Skills repos
    // are small enough that this isn't a concern in practice.
    const { tree } = (await response.json()) as { tree?: GitTreeEntry[] };
    return (tree ?? [])
      .filter((entry): entry is GitTreeEntry & { url: string } =>
        Boolean(entry.type === "blob" && entry.path.endsWith("/SKILL.md") && entry.url),
      )
      .map((entry) => ({ path: entry.path, url: entry.url }));
  },
  { maxAge: 10 * 60 * 1000 },
);

/**
 * Repo-tree lookup: read the repo's SKILL.md index and locate the one whose
 * enclosing folder matches the skill. Handles skills nested at any depth that
 * the flat-path guesses can't reach.
 */
async function fetchSkillContentFromTree(skill: Skill): Promise<SkillContentResult | undefined> {
  const entries = await fetchRepoSkillMdEntries(skill.source);
  const segmentsOf = (entry: SkillMdEntry) => entry.path.split("/");
  const dirNameOf = (entry: SkillMdEntry) => segmentsOf(entry).at(-2) ?? "";
  const isHidden = (entry: SkillMdEntry) => segmentsOf(entry).some((segment) => segment.startsWith("."));

  for (const dirName of candidateSkillDirNames(skill)) {
    // Prefer a visible, shallow path when more than one folder shares the name.
    const match = entries
      .filter((entry) => dirNameOf(entry) === dirName)
      .sort(
        (a, b) =>
          Number(isHidden(a)) - Number(isHidden(b)) ||
          segmentsOf(a).length - segmentsOf(b).length ||
          a.path.localeCompare(b.path),
      )[0];
    if (!match) continue;

    const blobResponse = await fetch(match.url, { headers: githubHeaders() });
    if (!blobResponse.ok) continue;

    const blob = (await blobResponse.json()) as { content?: string; encoding?: string };
    if (!blob.content) continue;

    const text = blob.encoding === "base64" ? Buffer.from(blob.content, "base64").toString("utf-8") : blob.content;
    return parseSkillContent(text);
  }

  return undefined;
}

export async function fetchSkillContent(skill: Skill): Promise<SkillContentResult | undefined> {
  // 1. Fast path: typical flat layouts straight from raw.githubusercontent.
  try {
    return await Promise.any(buildFlatSkillUrls(skill).map((url) => fetchRawSkillMd(url)));
  } catch {
    // No flat SKILL.md matched, fall through to the authoritative tree lookup.
  }

  // 2. Repo-tree path: locate the SKILL.md anywhere in the repo tree.
  try {
    return await fetchSkillContentFromTree(skill);
  } catch {
    return undefined;
  }
}
