import {
  App,
  Branch,
  CustomRule,
  GetAppCommand,
  GetJobCommand,
  JobSummary,
  ListAppsCommand,
  ListArtifactsCommand,
  ListBranchesCommand,
  ListJobsCommand,
  ListWebhooksCommand,
  StartJobCommand,
  Step,
  StopJobCommand,
  UpdateAppCommand,
  Webhook,
} from "@aws-sdk/client-amplify";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAWSErrorMessage } from "../errors";
import { getAmplifyClient } from "../services/clients/amplify";
import { isReadyToFetch } from "../util";

/**
 * Hook to fetch and manage all Amplify applications in the current AWS account
 * @returns Object containing apps array, error state, loading state, and revalidate function
 * @example
 * ```tsx
 * const { apps, error, isLoading, revalidate } = useAmplifyApps();
 * ```
 */
export function useAmplifyApps() {
  const {
    data: apps,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading Amplify apps" });
      return await fetchAmplifyApps(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌ Failed to load Amplify apps" } },
  );

  return { apps, error, isLoading: (!apps && !error) || isLoading, revalidate };
}

async function fetchAmplifyApps(toast: Toast, maxResults = 100): Promise<App[]> {
  const client = getAmplifyClient();
  const apps: App[] = [];
  let nextToken: string | undefined;

  do {
    const { apps: appsList, nextToken: cursor } = await client.send(new ListAppsCommand({ nextToken }));

    if (appsList) {
      apps.push(...appsList);
    }

    toast.message = `${apps.length} apps`;
    nextToken = cursor;
  } while (nextToken && apps.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded Amplify apps";
  toast.message = `${apps.length} apps`;
  return apps;
}

/**
 * Hook to fetch all branches for a specific Amplify application
 * @param appId - The unique identifier of the Amplify app
 * @returns Object containing branches array, error state, and loading state
 * @example
 * ```tsx
 * const { branches, error, isLoading } = useAmplifyBranches("d123456789");
 * ```
 */
export function useAmplifyBranches(appId: string) {
  const {
    data: branches,
    error,
    isLoading,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading branches" });
      return await fetchAmplifyBranches(id, toast);
    },
    [appId],
    { execute: isReadyToFetch() && !!appId, failureToastOptions: { title: "❌ Failed to load branches" } },
  );

  return { branches, error, isLoading: (!branches && !error) || isLoading };
}

async function fetchAmplifyBranches(appId: string, toast: Toast, maxResults = 100): Promise<Branch[]> {
  const client = getAmplifyClient();
  const branches: Branch[] = [];
  let nextToken: string | undefined;

  do {
    const { branches: branchList, nextToken: cursor } = await client.send(
      new ListBranchesCommand({ appId, nextToken }),
    );

    if (branchList) {
      branches.push(...branchList);
    }

    toast.message = `${branches.length} branches`;
    nextToken = cursor;
  } while (nextToken && branches.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded branches";
  toast.message = `${branches.length} branches`;
  return branches;
}

/**
 * Hook to fetch detailed information for a specific Amplify application
 * @param appId - The unique identifier of the Amplify app
 * @returns Object containing app details, error state, and loading state
 * @example
 * ```tsx
 * const { app, error, isLoading } = useAmplifyAppDetails("d123456789");
 * ```
 */
export function useAmplifyAppDetails(appId: string) {
  const {
    data: app,
    error,
    isLoading,
  } = useCachedPromise(
    async (id: string) => {
      const client = getAmplifyClient();
      const { app } = await client.send(new GetAppCommand({ appId: id }));
      return app;
    },
    [appId],
    { execute: isReadyToFetch() && !!appId, failureToastOptions: { title: "❌ Failed to load app details" } },
  );

  return { app, error, isLoading: (!app && !error) || isLoading };
}

/**
 * Hook to fetch all webhooks configured for a specific Amplify application
 * @param appId - The unique identifier of the Amplify app
 * @returns Object containing webhooks array, error state, and loading state
 * @example
 * ```tsx
 * const { webhooks, error, isLoading } = useAmplifyWebhooks("d123456789");
 * ```
 */
export function useAmplifyWebhooks(appId: string) {
  const {
    data: webhooks,
    error,
    isLoading,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading webhooks" });
      return await fetchAmplifyWebhooks(id, toast);
    },
    [appId],
    { execute: isReadyToFetch() && !!appId, failureToastOptions: { title: "❌ Failed to load webhooks" } },
  );

  return { webhooks, error, isLoading: (!webhooks && !error) || isLoading };
}

async function fetchAmplifyWebhooks(appId: string, toast: Toast, maxResults = 100): Promise<Webhook[]> {
  const client = getAmplifyClient();
  const webhooks: Webhook[] = [];
  let nextToken: string | undefined;

  do {
    const { webhooks: webhookList, nextToken: cursor } = await client.send(
      new ListWebhooksCommand({ appId, nextToken }),
    );

    if (webhookList) {
      webhooks.push(...webhookList);
    }

    toast.message = `${webhooks.length} webhooks`;
    nextToken = cursor;
  } while (nextToken && webhooks.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded webhooks";
  toast.message = `${webhooks.length} webhooks`;
  return webhooks;
}

/**
 * Hook to fetch build job history for a specific Amplify application branch
 * @param appId - The unique identifier of the Amplify app
 * @param branchName - The name of the branch (e.g., "main", "develop")
 * @returns Object containing jobs array, error state, loading state, and revalidate function
 * @example
 * ```tsx
 * const { jobs, error, isLoading, revalidate } = useAmplifyJobs("d123456789", "main");
 * ```
 */
export function useAmplifyJobs(appId: string, branchName: string) {
  const {
    data: jobs,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (appId: string, branchName: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading build history" });
      return await fetchAmplifyJobs(appId, branchName, toast);
    },
    [appId, branchName],
    {
      execute: isReadyToFetch() && !!appId && !!branchName,
      failureToastOptions: { title: "❌ Failed to load build history" },
    },
  );

  return { jobs, error, isLoading: (!jobs && !error) || isLoading, revalidate };
}

async function fetchAmplifyJobs(
  appId: string,
  branchName: string,
  toast: Toast,
  maxResults = 100,
): Promise<JobSummary[]> {
  const client = getAmplifyClient();
  const jobs: JobSummary[] = [];
  let nextToken: string | undefined;

  do {
    const { jobSummaries, nextToken: cursor } = await client.send(
      new ListJobsCommand({
        appId,
        branchName,
        nextToken,
        maxResults: Math.min(maxResults - jobs.length, 50),
      }),
    );

    if (jobSummaries) {
      jobs.push(...jobSummaries);
    }

    toast.message = `${jobs.length} builds`;
    nextToken = cursor;
  } while (nextToken && jobs.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded build history";
  toast.message = `${jobs.length} builds`;
  return jobs;
}

/**
 * Hook to fetch build artifacts for a specific Amplify build job
 * @param appId - The unique identifier of the Amplify app
 * @param branchName - The name of the branch (e.g., "main", "develop")
 * @param jobId - The unique identifier of the build job
 * @returns Object containing artifacts array, error state, and loading state
 * @example
 * ```tsx
 * const { artifacts, error, isLoading } = useAmplifyArtifacts("d123456789", "main", "1234");
 * ```
 */
export function useAmplifyArtifacts(appId: string, branchName: string, jobId: string) {
  const {
    data: artifacts,
    error,
    isLoading,
  } = useCachedPromise(
    async (appId: string, branchName: string, jobId: string) => {
      const client = getAmplifyClient();
      const { artifacts } = await client.send(new ListArtifactsCommand({ appId, branchName, jobId }));
      return artifacts;
    },
    [appId, branchName, jobId],
    {
      execute: isReadyToFetch() && !!appId && !!branchName && !!jobId,
      failureToastOptions: { title: "❌ Failed to load artifacts" },
    },
  );

  return { artifacts, error, isLoading: (!artifacts && !error) || isLoading };
}

/**
 * Hook to fetch full job details including build steps
 * @param appId - The Amplify app ID
 * @param branchName - The branch name
 * @param jobId - The job ID
 * @returns Object containing the full job with steps, error state, and loading state
 */
export function useAmplifyJobDetails(appId: string, branchName: string, jobId: string) {
  const {
    data: job,
    error,
    isLoading,
  } = useCachedPromise(
    async (appId: string, branchName: string, jobId: string) => {
      const client = getAmplifyClient();
      const { job } = await client.send(new GetJobCommand({ appId, branchName, jobId }));
      return job;
    },
    [appId, branchName, jobId],
    {
      execute: isReadyToFetch() && !!appId && !!branchName && !!jobId,
      failureToastOptions: { title: "❌ Failed to load job details" },
    },
  );

  return { job, error, isLoading: (!job && !error) || isLoading };
}

/**
 * Initiates a new build job for a specific Amplify application branch
 * @param appId - The unique identifier of the Amplify app
 * @param branchName - The name of the branch to build
 * @param sourceUrl - Optional source URL override for the build
 * @param commitId - Optional specific commit ID to build
 * @param commitMessage - Optional commit message for the build
 * @returns Promise resolving to JobSummary if successful, undefined otherwise
 * @throws Error if the build fails to start
 * @example
 * ```tsx
 * await startAmplifyBuild("d123456789", "main");
 * await startAmplifyBuild("d123456789", "main", undefined, "abc123", "Fix bug");
 * ```
 */
export async function startAmplifyBuild(
  appId: string,
  branchName: string,
  sourceUrl?: string,
  commitId?: string,
  commitMessage?: string,
): Promise<JobSummary | undefined> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting build",
    message: `Branch: ${branchName}`,
  });

  try {
    const client = getAmplifyClient();
    const { jobSummary } = await client.send(
      new StartJobCommand({
        appId,
        branchName,
        jobType: "RELEASE",
        ...(sourceUrl && { sourceUrl }),
        ...(commitId && { commitId }),
        ...(commitMessage && { commitMessage }),
      }),
    );

    toast.style = Toast.Style.Success;
    toast.title = "✅ Build started";
    toast.message = `Job ID: ${jobSummary?.jobId}`;
    return jobSummary;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "❌ Failed to start build";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}

/**
 * Cancels a currently running build job for an Amplify application branch
 * @param appId - The unique identifier of the Amplify app
 * @param branchName - The name of the branch
 * @param jobId - The unique identifier of the build job to cancel
 * @returns Promise resolving to JobSummary if successful, undefined otherwise
 * @throws Error if the build fails to cancel
 * @example
 * ```tsx
 * await stopAmplifyBuild("d123456789", "main", "1234");
 * ```
 */
export async function stopAmplifyBuild(
  appId: string,
  branchName: string,
  jobId: string,
): Promise<JobSummary | undefined> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Cancelling build",
    message: `Job ID: ${jobId}`,
  });

  try {
    const client = getAmplifyClient();
    const { jobSummary } = await client.send(
      new StopJobCommand({
        appId,
        branchName,
        jobId,
      }),
    );

    toast.style = Toast.Style.Success;
    toast.title = "✅ Build cancelled";
    toast.message = `Job ID: ${jobId}`;
    return jobSummary;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "❌ Failed to cancel build";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}

/**
 * Updates custom redirect and rewrite rules for an Amplify application
 * @param appId - The unique identifier of the Amplify app
 * @param customRules - Array of custom rules to apply to the application
 * @returns Promise resolving to updated App object if successful, undefined otherwise
 * @throws Error if the update fails
 * @example
 * ```tsx
 * const rules = [{ source: "/<*>", target: "/index.html", status: "200" }];
 * await updateAmplifyCustomRules("d123456789", rules);
 * ```
 */
export async function updateAmplifyCustomRules(appId: string, customRules: CustomRule[]): Promise<App | undefined> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Updating custom rules",
  });

  try {
    const client = getAmplifyClient();
    const { app } = await client.send(
      new UpdateAppCommand({
        appId,
        customRules,
      }),
    );

    toast.style = Toast.Style.Success;
    toast.title = "✅ Custom rules updated";
    return app;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "❌ Failed to update custom rules";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}

/**
 * Updates environment variables for an Amplify application
 * @param appId - The unique identifier of the Amplify app
 * @param environmentVariables - Record of environment variable key-value pairs
 * @returns Promise resolving to updated App object if successful, undefined otherwise
 * @throws Error if the update fails
 * @example
 * ```tsx
 * const envVars = { "API_URL": "https://api.example.com", "DEBUG": "true" };
 * await updateAmplifyEnvironmentVariables("d123456789", envVars);
 * ```
 */
export async function updateAmplifyEnvironmentVariables(
  appId: string,
  environmentVariables: Record<string, string>,
): Promise<App | undefined> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Updating environment variables",
  });

  try {
    const client = getAmplifyClient();
    const { app } = await client.send(
      new UpdateAppCommand({
        appId,
        environmentVariables,
      }),
    );

    toast.style = Toast.Style.Success;
    toast.title = "✅ Environment variables updated";
    return app;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "❌ Failed to update environment variables";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}

/**
 * Downloads build logs for a specific Amplify build job to the user's Downloads folder
 * @param appId - The unique identifier of the Amplify app
 * @param branchName - The name of the branch
 * @param jobId - The unique identifier of the build job
 * @returns Promise that resolves when logs are downloaded successfully
 * @throws Error if the download fails or logs are not available
 * @example
 * ```tsx
 * await downloadAmplifyBuildLogs("d123456789", "main", "1234");
 * ```
 */
export async function downloadAmplifyBuildLogs(appId: string, branchName: string, jobId: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading build logs",
    message: `Job ID: ${jobId}`,
  });

  try {
    const client = getAmplifyClient();
    const { job } = await client.send(
      new GetJobCommand({
        appId,
        branchName,
        jobId,
      }),
    );

    if (!job || !job.steps) {
      throw new Error("No job details or steps found");
    }

    // Extract log URLs from execution steps
    const logUrls = job.steps
      .filter((step: Step) => step.logUrl)
      .map((step: Step, index: number) => ({
        stepName: step.stepName || `step-${index}`,
        logUrl: step.logUrl as string, // Safe since we filtered for step.logUrl above
        status: step.status,
      }));

    if (logUrls.length === 0) {
      throw new Error("No log URLs found for this job");
    }

    // Import Node.js modules for file operations
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const { homedir } = await import("os");

    // Create logs directory in user's Downloads folder
    const logsDir = join(homedir(), "Downloads", "amplify-logs");
    await mkdir(logsDir, { recursive: true });

    // Download all log files in parallel for better performance
    const downloadResults = await Promise.allSettled(
      logUrls.map(async (logInfo) => {
        const response = await fetch(logInfo.logUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const logContent = await response.text();
        const fileName = `${jobId}-${logInfo.stepName}.log`;
        const filePath = join(logsDir, fileName);

        await writeFile(filePath, logContent);
        return logInfo.stepName;
      }),
    );

    // Log any failures
    const failures = downloadResults.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failures.length > 0) {
      console.warn(`Failed to download ${failures.length} log files`);
    }

    const successCount = downloadResults.filter((r) => r.status === "fulfilled").length;

    // Show logs directory in Finder
    const { showInFinder } = await import("@raycast/api");
    await showInFinder(logsDir);

    toast.style = Toast.Style.Success;
    toast.title = "✅ Build logs downloaded";
    toast.message = `${successCount} of ${logUrls.length} log files saved`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "❌ Failed to download build logs";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}
