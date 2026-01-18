import { HarvestClient } from "../api/harvest";
import { buildCandidateMap, chunkIds } from "./pipelineUtils";
import type {
  HarvestApplication,
  HarvestCandidate,
  HarvestJob,
  HarvestJobPost,
  HarvestJobStage,
  JobListItem,
} from "./types";

const CANDIDATE_BATCH_SIZE = 50;

export interface JobPipelineData {
  stages: HarvestJobStage[];
  applications: HarvestApplication[];
  candidates: Record<number, HarvestCandidate>;
}

export const fetchOpenJobs = async (client: HarvestClient) => {
  return client.listAll<HarvestJob>("jobs", { status: "open" });
};

export const fetchActiveJobPosts = async (
  client: HarvestClient,
): Promise<JobListItem[]> => {
  const [jobs, posts] = await Promise.all([
    client.listAll<HarvestJob>("jobs", { status: "open" }),
    client.listAll<HarvestJobPost>("job_posts", { active: "true" }),
  ]);

  // Build a map of job_id -> post flags
  const postFlags = new Map<
    number,
    { hasInternal: boolean; hasExternal: boolean }
  >();
  for (const post of posts) {
    const existing = postFlags.get(post.job_id);
    if (existing) {
      existing.hasInternal = existing.hasInternal || post.internal;
      existing.hasExternal = existing.hasExternal || post.external;
    } else {
      postFlags.set(post.job_id, {
        hasInternal: post.internal,
        hasExternal: post.external,
      });
    }
  }

  // Build job list from jobs, enriched with post flags
  const jobList: JobListItem[] = jobs
    .filter((job) => job.name)
    .map((job) => {
      const flags = postFlags.get(job.id);
      return {
        job_id: job.id,
        title: job.name,
        hasInternal: flags?.hasInternal ?? false,
        hasExternal: flags?.hasExternal ?? false,
        hasNoPosts: !flags,
      };
    });

  return jobList.sort((a, b) => a.title.localeCompare(b.title));
};

export const fetchJobPipelineData = async (
  client: HarvestClient,
  jobId: number,
): Promise<JobPipelineData> => {
  const [stageData, applicationData] = await Promise.all([
    client.listAll<HarvestJobStage>(`jobs/${jobId}/stages`),
    client.listAll<HarvestApplication>("applications", {
      job_id: jobId,
      status: "active",
    }),
  ]);

  const candidateIds = Array.from(
    new Set(applicationData.map((application) => application.candidate_id)),
  );
  const candidateData: HarvestCandidate[] = [];

  if (candidateIds.length) {
    const idChunks = chunkIds(candidateIds, CANDIDATE_BATCH_SIZE);
    for (const chunk of idChunks) {
      const batch = await client.listAll<HarvestCandidate>("candidates", {
        candidate_ids: chunk.join(","),
      });
      candidateData.push(...batch);
    }
  }

  return {
    stages: stageData,
    applications: applicationData,
    candidates: buildCandidateMap(candidateData),
  };
};
