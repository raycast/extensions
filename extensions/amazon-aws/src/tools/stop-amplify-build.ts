import { AmplifyClient, StopJobCommand, JobSummary } from "@aws-sdk/client-amplify";

/**
 * Stops a running build job for an Amplify app branch
 * @param options - Configuration options
 * @returns Promise<JobSummary | undefined> Job summary for the stopped build
 */
export default async function stopAmplifyBuild(options: {
  appId: string;
  branchName: string;
  jobId: string;
}): Promise<JobSummary | undefined> {
  const { appId, branchName, jobId } = options;

  if (!appId) {
    throw new Error("App ID is required");
  }
  if (!branchName) {
    throw new Error("Branch name is required");
  }
  if (!jobId) {
    throw new Error("Job ID is required");
  }

  const client = new AmplifyClient({});

  const command = new StopJobCommand({
    appId,
    branchName,
    jobId,
  });

  const response = await client.send(command);
  return response.jobSummary;
}
