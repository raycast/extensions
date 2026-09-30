import { AmplifyClient, ListJobsCommand, JobSummary } from "@aws-sdk/client-amplify";

/**
 * Lists build jobs for a specific Amplify app branch
 * @param options - Configuration options
 * @returns Promise<JobSummary[]> Array of job summaries
 */
export default async function listAmplifyJobs(options: {
  appId: string;
  branchName: string;
  maxResults?: number;
}): Promise<JobSummary[]> {
  const { appId, branchName, maxResults = 50 } = options;

  if (!appId) {
    throw new Error("App ID is required");
  }
  if (!branchName) {
    throw new Error("Branch name is required");
  }

  const client = new AmplifyClient({});

  const jobs: JobSummary[] = [];
  let nextToken: string | undefined;

  do {
    const command = new ListJobsCommand({
      appId,
      branchName,
      nextToken,
      maxResults: Math.min(maxResults - jobs.length, 25), // AWS limit is 25 per request
    });
    const response = await client.send(command);

    if (response.jobSummaries) {
      jobs.push(...response.jobSummaries);
    }

    nextToken = response.nextToken;
  } while (nextToken && jobs.length < maxResults);

  return jobs;
}
