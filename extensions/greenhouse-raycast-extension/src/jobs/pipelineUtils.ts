import type {
  HarvestApplication,
  HarvestCandidate,
  HarvestJobStage,
} from "./types";

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_RECRUITING_BASE_URL = "https://s101.recruiting.eu.greenhouse.io";

export interface PipelineSection {
  id: string;
  title: string;
  applications: HarvestApplication[];
}

export const buildCandidateName = (candidate?: HarvestCandidate) => {
  if (!candidate) {
    return null;
  }
  const firstName = candidate.first_name?.trim();
  const lastName = candidate.last_name?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  if (fullName) {
    return fullName;
  }
  return candidate.name?.trim() || null;
};

export const getDaysSince = (dateValue?: string | null) => {
  if (!dateValue) {
    return null;
  }
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }
  const diffDays = Math.floor(
    Math.max(0, Date.now() - timestamp) / MILLISECONDS_PER_DAY,
  );
  return diffDays;
};

export const chunkIds = (ids: number[], size: number) => {
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
};

export const buildCandidateMap = (candidates: HarvestCandidate[]) => {
  return candidates.reduce<Record<number, HarvestCandidate>>(
    (map, candidate) => {
      map[candidate.id] = candidate;
      return map;
    },
    {},
  );
};

export const buildPipelineSections = (
  applications: HarvestApplication[],
  stages: HarvestJobStage[],
): PipelineSection[] => {
  const grouped = new Map<string, HarvestApplication[]>();
  for (const application of applications) {
    const stageId = application.current_stage?.id ?? "none";
    const key = String(stageId);
    const currentGroup = grouped.get(key) ?? [];
    currentGroup.push(application);
    grouped.set(key, currentGroup);
  }

  const stageEntries = new Map<
    number,
    { id: number; name: string; priority: number }
  >();

  for (const stage of stages) {
    stageEntries.set(stage.id, {
      id: stage.id,
      name: stage.name,
      priority: stage.priority,
    });
  }

  for (const application of applications) {
    const currentStage = application.current_stage;
    if (!currentStage) {
      continue;
    }
    if (!stageEntries.has(currentStage.id)) {
      stageEntries.set(currentStage.id, {
        id: currentStage.id,
        name: currentStage.name,
        priority: Number.MAX_SAFE_INTEGER,
      });
    }
  }

  const orderedStages = [...stageEntries.values()].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }
    return left.name.localeCompare(right.name);
  });

  const output = orderedStages
    .map((stage) => {
      const items = grouped.get(String(stage.id)) ?? [];
      return {
        id: String(stage.id),
        title: stage.name,
        applications: items,
      };
    })
    .filter((section) => section.applications.length > 0);

  const noStageApplications = grouped.get("none");
  if (noStageApplications?.length) {
    output.push({
      id: "none",
      title: "No Stage",
      applications: noStageApplications,
    });
  }

  return output;
};

export const buildCandidateApplicationUrl = (
  baseUrl: string | undefined,
  candidateId: number,
  applicationId: number,
) => {
  const resolvedBaseUrl = baseUrl?.trim();
  const normalizedBaseUrl = (
    resolvedBaseUrl || DEFAULT_RECRUITING_BASE_URL
  ).replace(/\/$/, "");
  return `${normalizedBaseUrl}/people/${candidateId}/applications/${applicationId}/redesign`;
};

const STAGE_COLOR_RULES: Array<{
  keywords: string[];
  color: StageTintName;
}> = [
  { keywords: ["reject", "declin", "withdraw", "archive"], color: "red" },
  { keywords: ["hire", "offer"], color: "green" },
  {
    keywords: ["interview", "onsite", "on-site", "take home", "assessment"],
    color: "purple",
  },
  { keywords: ["phone", "screen"], color: "orange" },
  { keywords: ["application", "review"], color: "blue" },
];

export type StageTintName =
  | "red"
  | "green"
  | "purple"
  | "orange"
  | "blue"
  | "secondary";

export const getStageTintName = (stageName?: string | null): StageTintName => {
  const normalized = stageName?.toLowerCase().trim();
  if (!normalized) {
    return "secondary";
  }
  for (const rule of STAGE_COLOR_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.color;
    }
  }
  return "secondary";
};
