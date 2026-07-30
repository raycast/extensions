import type { Skill } from "./api";

interface RecordSkillViewInput {
  apiUrl: string;
  fetchImpl?: typeof fetch;
  path?: string;
  skillId: string;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/u, "");

export const buildSkillViewPath = (skill: Pick<Skill, "authorHandle" | "repoName" | "slug">) => {
  const path = [skill.authorHandle, skill.repoName, skill.slug].filter(Boolean).join("/");
  return `/skills/${path || skill.slug}`;
};

export const recordSkillViewMetric = async ({ apiUrl, fetchImpl = fetch, path, skillId }: RecordSkillViewInput) => {
  const response = await fetchImpl(`${trimTrailingSlash(apiUrl)}/metrics/skills/view/record`, {
    body: JSON.stringify({
      ...(path ? { path } : {}),
      skillId,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to record skill view.");
  }
};
