import { AmplifyClient, StartJobCommand, JobSummary } from "@aws-sdk/client-amplify";

/**
 * Starts a new build job for an Amplify app branch
 * @param options - Build configuration options
 * @returns Promise<JobSummary | undefined> Job summary for the started build
 */
export default async function startAmplifyBuild(options: {
  appId: string;
  branchName: string;
  sourceUrl?: string;
  commitId?: string;
  commitMessage?: string;
}): Promise<JobSummary | undefined> {
  const { appId, branchName, sourceUrl, commitId, commitMessage } = options;

  if (!appId) {
    throw new Error("App ID is required");
  }
  if (!branchName) {
    throw new Error("Branch name is required");
  }

  const client = new AmplifyClient({});

  const command = new StartJobCommand({
    appId,
    branchName,
    jobType: "RELEASE",
    ...(sourceUrl && { sourceUrl }),
    ...(commitId && { commitId }),
    ...(commitMessage && { commitMessage }),
  });

  const response = await client.send(command);
  return response.jobSummary;
}
