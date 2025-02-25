import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import { Cache } from "@raycast/api";

export const cache = new Cache();
export const CACHE_KEY = "small-prs-cache";
export const SEEN_PRS_KEY = "seen-prs-cache";

export interface SmallPR {
  title: string;
  url: string;
  additions: number;
  deletions: number;
  repository: string;
  number: number;
  author: string;
  createdAt: string;
  seen?: boolean;
}

export function getCachedPRs(): SmallPR[] {
  const cached = cache.get(CACHE_KEY);
  const seenPRs = new Set(JSON.parse(cache.get(SEEN_PRS_KEY) || "[]"));
  const prs = cached ? JSON.parse(cached) : [];
  return prs.map((pr: SmallPR) => ({
    ...pr,
    seen: seenPRs.has(`${pr.repository}-${pr.number}`),
  }));
}

export function setCachedPRs(prs: SmallPR[]) {
  cache.set(CACHE_KEY, JSON.stringify(prs));
}

export function markPRAsSeen(pr: SmallPR) {
  const seenPRs = new Set(JSON.parse(cache.get(SEEN_PRS_KEY) || "[]"));
  seenPRs.add(`${pr.repository}-${pr.number}`);
  cache.set(SEEN_PRS_KEY, JSON.stringify(Array.from(seenPRs)));
}

export async function createOctokitWithSSH(): Promise<Octokit> {
  try {
    const credentials = execSync("git credential fill", {
      input: "url=https://github.com\n\n",
      encoding: "utf8",
    });

    const token = credentials.match(/password=(.+)\n/)?.[1];
    if (!token) {
      throw new Error("No GitHub token found in git credentials");
    }

    return new Octokit({ auth: token });
  } catch (error) {
    throw new Error("Failed to authenticate. Please store your GitHub token in git credentials");
  }
}
