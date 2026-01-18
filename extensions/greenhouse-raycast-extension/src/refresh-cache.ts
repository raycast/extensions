import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { HarvestClient, HarvestError } from "./api/harvest";
import { setCachedJobs, setCachedPipeline } from "./cache/cacheUtils";
import { fetchActiveJobPosts, fetchJobPipelineData } from "./jobs/harvestData";

const RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_BASE_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withRateLimitRetry = async <T>(
  task: () => Promise<T>,
  label: string,
): Promise<T> => {
  let attempt = 0;

  while (true) {
    try {
      return await task();
    } catch (err) {
      if (err instanceof HarvestError && err.status === 429) {
        if (attempt < RATE_LIMIT_RETRIES) {
          const delay = RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `Rate limit hit while fetching ${label}. Retrying in ${delay}ms.`,
          );
          await sleep(delay);
          attempt += 1;
          continue;
        }
      }
      throw err;
    }
  }
};

export default async function RefreshCacheCommand() {
  const preferences = getPreferenceValues<{
    harvestApiKey: string;
    harvestBaseUrl?: string;
  }>();

  const client = new HarvestClient({
    apiKey: preferences.harvestApiKey,
    baseUrl: preferences.harvestBaseUrl,
  });

  try {
    const jobs = await withRateLimitRetry(
      () => fetchActiveJobPosts(client),
      "active job posts",
    );
    setCachedJobs(jobs);

    let successCount = 0;
    let errorCount = 0;

    for (const job of jobs) {
      try {
        const pipelineData = await withRateLimitRetry(
          () => fetchJobPipelineData(client, job.job_id),
          `pipeline for job ${job.job_id}`,
        );
        setCachedPipeline(job.job_id, pipelineData);
        successCount += 1;
      } catch (err) {
        console.error(`Failed to refresh pipeline for job ${job.job_id}:`, err);
        errorCount += 1;
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Cache refreshed",
      message:
        errorCount > 0
          ? `Updated ${successCount} jobs, ${errorCount} failed`
          : `Updated ${successCount} jobs`,
    });
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cache refresh failed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
