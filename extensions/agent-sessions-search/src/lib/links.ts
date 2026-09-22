import { getPreferenceValues } from "@raycast/api";
import { getMeta } from "./db";
import { SessionHit } from "./types";

/** URLs for the PRs and issues a session refers to. */
export function prUrl(hit: SessionHit, number: string): string | null {
  const repo = hit.prRepos[number] ?? hit.repo;
  return repo ? `https://github.com/${repo}/pull/${number}` : null;
}

let cachedWorkspace: string | null | undefined;

export function linearWorkspace(): string | null {
  const pref = getPreferenceValues<{ linearWorkspace?: string }>().linearWorkspace?.trim();
  if (pref) return pref;
  if (cachedWorkspace === undefined) cachedWorkspace = getMeta("linearWorkspace");
  return cachedWorkspace;
}

export function linearUrl(key: string): string | null {
  const ws = linearWorkspace();
  return ws ? `https://linear.app/${ws}/issue/${key}` : null;
}
