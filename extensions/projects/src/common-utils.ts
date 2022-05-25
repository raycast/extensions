import { OpenWith, Preferences, SourceRepo } from "./types";

export function getRepoKey(repo: SourceRepo): string {
  return `${repo.fullPath}/${repo.name}~${repo.type}`;
}

export function isProjectTypeEnabled(openWithKey: string, preferences: Preferences): boolean {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const anyPreferences = preferences as any;
  return anyPreferences[openWithKey] !== undefined;
}

export function getOpenWith(openWithKey: string, preferences: Preferences): OpenWith {
  const anyPreferences = preferences as any;
  return anyPreferences[openWithKey] || preferences.openDefaultWith;
}
