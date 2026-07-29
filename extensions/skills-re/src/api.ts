import { environment } from "@raycast/api";

import { buildApiFailureDiagnostics, parseApiErrorPayload } from "./api-error";
import { getApiToken } from "./api-token";
import { buildApiRequestHeaders } from "./request-headers";
import { buildSearchSkillsBody } from "./search-request";
import type { SearchSkillsInput } from "./search-request";

const DEFAULT_API_URL = "https://api.skills.re";
const DEFAULT_SITE_URL = "https://skills.re";

export type SkillSort = "newest" | "updated" | "views" | "downloads-trending" | "downloads-all-time" | "stars";

export interface Skill {
  author?: {
    handle?: string;
    name?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
  authorHandle?: string;
  createdAt?: number;
  description: string;
  downloadsAllTime?: number;
  downloadsTrending?: number;
  id: string;
  isVerified?: boolean;
  latestAuditScore?: number;
  latestSnapshotId?: string;
  latestSnapshotTotalBytes?: number;
  latestVersion?: string;
  license?: string;
  primaryCategory?: string;
  repoName?: string;
  repoUrl?: string;
  forkCount?: number;
  slug: string;
  stargazerCount?: number;
  staticAudit?: {
    isBlocked: boolean;
    overallScore: number;
    riskLevel: "safe" | "low" | "medium" | "high" | "critical";
    safeToPublish: boolean;
    status: "pass" | "fail";
    summary: string;
    syncTime: number;
  };
  syncTime?: number;
  tags?: string[];
  title: string;
  updatedAt?: number;
  viewsAllTime?: number;
}

export interface SkillPage {
  continueCursor: string;
  isDone: boolean;
  page: Skill[];
}

export type SavedSkill = Skill;

export interface SavedSkillPage {
  continueCursor: string;
  isDone: boolean;
  page: SavedSkill[];
}

export interface SkillReview {
  author: {
    avatarUrl: string | null;
    name: string;
  };
  content: string;
  createdAt: number;
  id: string;
  rating: number;
  skillId: string;
  title?: string;
  updatedAt: number;
  userId: string;
}

export interface CreateReviewInput {
  content: string;
  rating: number;
  skillId: string;
  title: string;
}

export interface Snapshot {
  archiveR2Key?: string | null;
  description: string;
  directoryPath: string;
  entryPath: string;
  hash: string;
  id: string;
  isDeprecated: boolean;
  name: string;
  skillId: string;
  sourceCommitDate?: number | null;
  sourceCommitMessage?: string | null;
  sourceCommitSha?: string | null;
  sourceCommitUrl?: string | null;
  syncTime: number;
  version: string;
}

export interface SnapshotFileContent {
  bytesRead: number;
  content: string;
  isTruncated: boolean;
  offset: number;
  totalBytes: number;
}

export interface SnapshotTreeEntry {
  path: string;
  size?: number;
  type: "blob";
}

export interface AuthCredential {
  token: string;
}

interface RequestOptions {
  body?: unknown;
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  token?: string;
}

export class ApiError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
    this.status = status;
  }
}

export const getApiUrl = () => DEFAULT_API_URL;

export const getSiteUrl = () => DEFAULT_SITE_URL;

const buildUrl = (path: string, query?: RequestOptions["query"]) => {
  const url = new URL(path, getApiUrl());
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const url = buildUrl(path, options.query);

  if (environment.isDevelopment) {
    console.debug("[skills.re] API request", {
      hasApiKey: Boolean(options.token),
      method,
      url: url.toString(),
    });
  }

  const response = await fetch(url, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: buildApiRequestHeaders({
      hasBody: options.body !== undefined,
      token: options.token,
    }),
    method,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    const fallbackMessage = `Request failed with status ${response.status}`;
    const parsed = parseApiErrorPayload(details, fallbackMessage);
    if (environment.isDevelopment) {
      console.error(
        "[skills.re] API request failed",
        buildApiFailureDiagnostics({
          code: parsed.code,
          hasApiKey: Boolean(options.token),
          message: parsed.message,
          method,
          responseBody: details,
          status: response.status,
          token: options.token,
          url: url.toString(),
        }),
      );
    }
    throw new ApiError(parsed.message, response.status, parsed.code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const getActiveCredential = async () => {
  const token = await getApiToken();
  return token ? { token } : null;
};

export const searchSkills = async (input: SearchSkillsInput) => {
  const credential = input.searchMode === "semantic" ? await getActiveCredential() : null;
  return await request<SkillPage>("/skills/search", {
    body: buildSearchSkillsBody(input),
    token: credential?.token,
  });
};

export const listSavedSkills = async (input: { cursor?: string; limit?: number; token: string }) =>
  await request<SavedSkillPage>("/skills/saved", {
    query: { cursor: input.cursor },
    token: input.token,
  });

export const getSkillByPath = async (skill: Pick<Skill, "authorHandle" | "repoName" | "slug">) =>
  await request<Skill | null>("/skills/by-path", {
    query: {
      authorHandle: skill.authorHandle,
      repoName: skill.repoName,
      skillSlug: skill.slug,
    },
  });

export const listSnapshotsBySkill = async (input: { cursor?: string; limit?: number; skillId: string }) =>
  await request<{ continueCursor: string; isDone: boolean; page: Snapshot[] }>("/snapshots", {
    query: { cursor: input.cursor, skillId: input.skillId },
  });

export const readSnapshotFileContent = async (input: { maxBytes?: number; path: string; snapshotId: string }) =>
  await request<SnapshotFileContent>("/snapshots/file-content", {
    query: {
      path: input.path,
      snapshotId: input.snapshotId,
    },
  });

export const getSnapshotTreeEntries = async (snapshotId: string) =>
  await request<SnapshotTreeEntry[]>("/snapshots/tree", {
    query: { snapshotId },
  });

export const saveSkill = async (slug: string, token: string) =>
  await request<{ alreadySaved: boolean; saved: boolean }>("/skills/save", {
    body: { slug },
    token,
  });

export const unsaveSkill = async (slug: string, token: string) =>
  await request<{ unsaved: boolean }>("/skills/unsave", {
    body: { slug },
    token,
  });

export const checkSaved = async (slug: string, token: string) =>
  await request<{ saved: boolean }>("/skills/check-saved", {
    query: { slug },
    token,
  });

export const createReview = async (input: CreateReviewInput, token: string) =>
  await request<SkillReview>("/reviews", {
    body: input,
    token,
  });

export const resolveInstall = async (skillPath: string) =>
  await request<{
    archive: { available: boolean; downloadUrl?: string; fileName: string };
    skill: Skill;
    snapshot: { version: string };
  }>("/cli/skills/resolve-install", {
    query: { skill: skillPath },
  });

export const skillPath = (skill: Pick<Skill, "authorHandle" | "repoName" | "slug">) =>
  [skill.authorHandle, skill.repoName, skill.slug].filter(Boolean).join("/");

export const skillUrl = (skill: Pick<Skill, "authorHandle" | "repoName" | "slug">) => {
  const path = skillPath(skill);
  return `${getSiteUrl()}/skills/${path || skill.slug}`;
};
