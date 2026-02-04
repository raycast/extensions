import { Cache } from "@raycast/api";
import type { CandidateSearchData, JobPipelineData } from "../jobs/harvestData";
import type { JobListItem } from "../jobs/types";

const cache = new Cache();

export const CACHE_KEY_JOBS_OPEN = "jobs:v4";
export const CACHE_KEY_APPLICATIONS_ACTIVE = "applications:v1";
export const CACHE_KEY_PIPELINE_PREFIX = "pipeline:";

export const getCachedJobs = (): JobListItem[] | null => {
  try {
    const cached = cache.get(CACHE_KEY_JOBS_OPEN);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached) as JobListItem[];
  } catch (err) {
    console.error("Failed to parse cached jobs:", err);
    return null;
  }
};

export const setCachedJobs = (jobs: JobListItem[]): void => {
  try {
    cache.set(CACHE_KEY_JOBS_OPEN, JSON.stringify(jobs));
    cache.set(`${CACHE_KEY_JOBS_OPEN}:updatedAt`, new Date().toISOString());
  } catch (err) {
    console.error("Failed to cache jobs:", err);
  }
};

export const getCachedApplications = (): CandidateSearchData | null => {
  try {
    const cached = cache.get(CACHE_KEY_APPLICATIONS_ACTIVE);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached) as CandidateSearchData;
  } catch (err) {
    console.error("Failed to parse cached applications:", err);
    return null;
  }
};

export const setCachedApplications = (data: CandidateSearchData): void => {
  try {
    cache.set(CACHE_KEY_APPLICATIONS_ACTIVE, JSON.stringify(data));
    cache.set(
      `${CACHE_KEY_APPLICATIONS_ACTIVE}:updatedAt`,
      new Date().toISOString(),
    );
  } catch (err) {
    console.error("Failed to cache applications:", err);
  }
};

export const getCachedPipeline = (jobId: number): JobPipelineData | null => {
  try {
    const key = `${CACHE_KEY_PIPELINE_PREFIX}${jobId}`;
    const cached = cache.get(key);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached) as JobPipelineData;
  } catch (err) {
    console.error(`Failed to parse cached pipeline for job ${jobId}:`, err);
    return null;
  }
};

export const setCachedPipeline = (
  jobId: number,
  data: JobPipelineData,
): void => {
  try {
    const key = `${CACHE_KEY_PIPELINE_PREFIX}${jobId}`;
    cache.set(key, JSON.stringify(data));
    cache.set(`${key}:updatedAt`, new Date().toISOString());
  } catch (err) {
    console.error(`Failed to cache pipeline for job ${jobId}:`, err);
  }
};
