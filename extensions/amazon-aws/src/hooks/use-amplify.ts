import {
  AmplifyClient,
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
  StopJobCommand,
  UpdateAppCommand,
  Webhook,
} from "@aws-sdk/client-amplify";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
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

async function fetchAmplifyApps(toast: Toast, nextToken?: string, aggregate?: App[]): Promise<App[]> {
  const client = new AmplifyClient({});
  const { apps, nextToken: cursor } = await client.send(new ListAppsCommand({ nextToken }));

  const filteredApps = apps ?? [];
  const agg = [...(aggregate ?? []), ...filteredApps];

  toast.message = `${agg.length} apps`;

  if (cursor) {
    return await fetchAmplifyApps(toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded Amplify apps";
  toast.message = `${agg.length} apps`;
  return agg;
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

async function fetchAmplifyBranches(
  appId: string,
  toast: Toast,
  nextToken?: string,
  aggregate?: Branch[],
): Promise<Branch[]> {
  const client = new AmplifyClient({});
  const { branches, nextToken: cursor } = await client.send(new ListBranchesCommand({ appId, nextToken }));

  const filteredBranches = branches ?? [];
  const agg = [...(aggregate ?? []), ...filteredBranches];

  toast.message = `${agg.length} branches`;

  if (cursor) {
    return await fetchAmplifyBranches(appId, toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded branches";
  toast.message = `${agg.length} branches`;
  return agg;
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
      const client = new AmplifyClient({});
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

async function fetchAmplifyWebhooks(
  appId: string,
  toast: Toast,
  nextToken?: string,
  aggregate?: Webhook[],
): Promise<Webhook[]> {
  const client = new AmplifyClient({});
  const { webhooks, nextToken: cursor } = await client.send(new ListWebhooksCommand({ appId, nextToken }));

  const filteredWebhooks = webhooks ?? [];
  const agg = [...(aggregate ?? []), ...filteredWebhooks];

  toast.message = `${agg.length} webhooks`;

  if (cursor) {
    return await fetchAmplifyWebhooks(appId, toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded webhooks";
  toast.message = `${agg.length} webhooks`;
  return agg;
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
  nextToken?: string,
  aggregate?: JobSummary[],
): Promise<JobSummary[]> {
  const client = new AmplifyClient({});
  const { jobSummaries, nextToken: cursor } = await client.send(
    new ListJobsCommand({ appId, branchName, nextToken, maxResults: 50 }),
  );

  const filteredJobs = jobSummaries ?? [];
  const agg = [...(aggregate ?? []), ...filteredJobs];

  toast.message = `${agg.length} builds`;

  if (cursor) {
    return await fetchAmplifyJobs(appId, branchName, toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded build history";
  toast.message = `${agg.length} builds`;
  return agg;
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
      const client = new AmplifyClient({});
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
    const client = new AmplifyClient({});
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
    toast.message = error instanceof Error ? error.message : "Unknown error";
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
    const client = new AmplifyClient({});
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
    toast.message = error instanceof Error ? error.message : "Unknown error";
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
    const client = new AmplifyClient({});
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
    toast.message = error instanceof Error ? error.message : "Unknown error";
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
    const client = new AmplifyClient({});
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
    toast.message = error instanceof Error ? error.message : "Unknown error";
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
    const client = new AmplifyClient({});
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
      .filter((step) => step.logUrl)
      .map((step, index) => ({
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

    // Download each log file
    for (const logInfo of logUrls) {
      try {
        const response = await fetch(logInfo.logUrl);

        if (!response.ok) {
          console.warn(`Failed to download log for ${logInfo.stepName}: ${response.status}`);
          continue;
        }

        const logContent = await response.text();
        const fileName = `${jobId}-${logInfo.stepName}.log`;
        const filePath = join(logsDir, fileName);

        await writeFile(filePath, logContent);
      } catch (error) {
        // Log download failed for this step, continue with others
      }
    }

    // Show logs directory in Finder
    const { showInFinder } = await import("@raycast/api");
    await showInFinder(logsDir);

    toast.style = Toast.Style.Success;
    toast.title = "✅ Build logs downloaded";
    toast.message = `${logUrls.length} log files saved`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "❌ Failed to download build logs";
    toast.message = error instanceof Error ? error.message : "Unknown error";
    throw error;
  }
}
