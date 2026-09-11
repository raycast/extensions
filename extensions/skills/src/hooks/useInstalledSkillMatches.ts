import { useCallback, useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getInstalledSkillsWithLock } from "../utils/installed-skills";
import { stripGitSuffix, type InstalledSkill, type Skill } from "../shared";

export type InstalledSkillMatch =
  | { type: "none" }
  | { type: "exact"; agents: string[]; source: string }
  | { type: "conflict"; agents: string[]; source?: string };

function normalizeSkillIdentityPart(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeGithubSource(source: string | undefined): string | undefined {
  if (!source) return undefined;

  const normalized = stripGitSuffix(source.trim())
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/^git@github\.com:/i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  return normalized ? normalizeSkillIdentityPart(normalized) : undefined;
}

export function useInstalledSkillMatches() {
  const { data, isLoading, revalidate } = useCachedPromise(getInstalledSkillsWithLock, [], {
    keepPreviousData: true,
  });

  const installedByName = useMemo(() => {
    const map = new Map<string, InstalledSkill>();
    for (const record of data ?? []) {
      map.set(normalizeSkillIdentityPart(record.name), record);
    }
    return map;
  }, [data]);

  const getInstalledMatch = useCallback(
    (skill: Skill): InstalledSkillMatch => {
      const installed = installedByName.get(normalizeSkillIdentityPart(skill.skillId));
      if (!installed) return { type: "none" };

      const installedSource = normalizeGithubSource(installed.source);
      if (!installedSource) {
        return { type: "conflict", agents: installed.agents, source: installed.source };
      }

      const candidateSource = normalizeGithubSource(skill.source);
      if (candidateSource && installedSource === candidateSource) {
        return { type: "exact", agents: installed.agents, source: installed.source ?? skill.source };
      }

      return { type: "conflict", agents: installed.agents, source: installed.source };
    },
    [installedByName],
  );

  return {
    getInstalledMatch,
    isLoading,
    revalidate,
  };
}
