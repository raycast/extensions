import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  AmplifyClient,
  ListAppsCommand,
  App,
  ListBranchesCommand,
  Branch,
  GetAppCommand,
} from "@aws-sdk/client-amplify";
import { showToast, Toast } from "@raycast/api";

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
