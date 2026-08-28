import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import { sep } from "node:path";

const preferences = getPreferenceValues<Preferences>();

export const getCustomNpxPath = (): string | undefined => {
  const customPath = preferences.customNpxPath?.trim();
  if (!customPath) return undefined;

  if (customPath === "~") {
    return homedir();
  }

  if (customPath.startsWith("~/") || customPath.startsWith(`~${sep}`)) {
    return homedir() + customPath.slice(1);
  }

  return customPath;
};

export const getGithubToken = (): string | undefined => {
  const token = preferences.githubToken?.trim();
  return token || undefined;
};

export const shouldDisableSkillsCliTelemetry = (): boolean => preferences.disableSkillsCliTelemetry === true;

export const getDefaultAgents = (): string[] => {
  const raw = preferences.defaultAgents?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};
