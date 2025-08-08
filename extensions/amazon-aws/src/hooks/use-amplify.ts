import {
  AmplifyClient,
  App,
  Branch,
  CustomRule,
  GetAppCommand,
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
 * Hook to fetch and manage Amplify apps
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
 * Hook to fetch branches for a specific Amplify app
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
 * Hook to fetch details for a specific Amplify app
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
 * Hook to fetch webhooks for a specific Amplify app
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
 * Hook to fetch build jobs for a specific Amplify app and branch
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
 * Hook to fetch artifacts for a specific job
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
 * Start a new build job for an Amplify branch
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
 * Cancel a running build job
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
 * Update custom headers and rules for an Amplify app
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
 * Update environment variables for an Amplify app
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
