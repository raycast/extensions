import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  QuickSightClient,
  DashboardSummary,
  AnalysisSummary,
  DataSetSummary,
  ListDashboardsCommand,
  ListAnalysesCommand,
  ListDataSetsCommand,
} from "@aws-sdk/client-quicksight";
import { GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getQuickSightClient as getQuickSightClientBase, getSTSClient } from "../services/clients/quicksight";

const accountIdCache = new Map<string, string>();

async function getAwsAccountId(): Promise<string> {
  const profile = process.env.AWS_PROFILE ?? process.env.AWS_VAULT ?? "default";
  if (accountIdCache.has(profile)) return accountIdCache.get(profile)!;

  const accountId =
    process.env.AWS_SSO_ACCOUNT_ID ?? (await getSTSClient().send(new GetCallerIdentityCommand({}))).Account;
  if (!accountId) throw new Error("Could not determine AWS account ID");
  accountIdCache.set(profile, accountId);
  return accountId;
}

function getQuickSightClient(): QuickSightClient {
  const { quicksightRegion } = getPreferenceValues<Preferences.Quicksight>();
  const region = quicksightRegion?.trim() || undefined;
  return getQuickSightClientBase(region);
}

export const useQuickSightDashboards = () => {
  const {
    data: dashboards,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading dashboards" });
      return await fetchDashboards(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load dashboards" } },
  );

  return { dashboards, error, isLoading: (!dashboards && !error) || isLoading, revalidate };
};

export const useQuickSightAnalyses = () => {
  const {
    data: analyses,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading analyses" });
      return await fetchAnalyses(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load analyses" } },
  );

  return { analyses, error, isLoading: (!analyses && !error) || isLoading, revalidate };
};

export const useQuickSightDataSets = () => {
  const {
    data: dataSets,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading data sets" });
      return await fetchDataSets(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load data sets" } },
  );

  return { dataSets, error, isLoading: (!dataSets && !error) || isLoading, revalidate };
};

async function fetchDashboards(toast: Toast, maxResults = 100): Promise<DashboardSummary[]> {
  const accountId = await getAwsAccountId();
  const client = getQuickSightClient();
  const allDashboards: DashboardSummary[] = [];
  let nextToken: string | undefined;

  do {
    const { DashboardSummaryList, NextToken } = await client.send(
      new ListDashboardsCommand({
        AwsAccountId: accountId,
        NextToken: nextToken,
        MaxResults: Math.min(maxResults - allDashboards.length, 100),
      }),
    );

    allDashboards.push(...(DashboardSummaryList ?? []));
    toast.message = `${allDashboards.length} dashboards`;
    nextToken = NextToken;
  } while (nextToken && allDashboards.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded dashboards";
  toast.message = `${allDashboards.length} dashboards`;
  return allDashboards;
}

async function fetchAnalyses(toast: Toast, maxResults = 100): Promise<AnalysisSummary[]> {
  const accountId = await getAwsAccountId();
  const client = getQuickSightClient();
  const allAnalyses: AnalysisSummary[] = [];
  let nextToken: string | undefined;

  do {
    const { AnalysisSummaryList, NextToken } = await client.send(
      new ListAnalysesCommand({
        AwsAccountId: accountId,
        NextToken: nextToken,
        MaxResults: Math.min(maxResults - allAnalyses.length, 100),
      }),
    );

    allAnalyses.push(...(AnalysisSummaryList ?? []));
    toast.message = `${allAnalyses.length} analyses`;
    nextToken = NextToken;
  } while (nextToken && allAnalyses.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded analyses";
  toast.message = `${allAnalyses.length} analyses`;
  return allAnalyses;
}

async function fetchDataSets(toast: Toast, maxResults = 100): Promise<DataSetSummary[]> {
  const accountId = await getAwsAccountId();
  const client = getQuickSightClient();
  const allDataSets: DataSetSummary[] = [];
  let nextToken: string | undefined;

  do {
    const { DataSetSummaries, NextToken } = await client.send(
      new ListDataSetsCommand({
        AwsAccountId: accountId,
        NextToken: nextToken,
        MaxResults: Math.min(maxResults - allDataSets.length, 100),
      }),
    );

    allDataSets.push(...(DataSetSummaries ?? []));
    toast.message = `${allDataSets.length} data sets`;
    nextToken = NextToken;
  } while (nextToken && allDataSets.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded data sets";
  toast.message = `${allDataSets.length} data sets`;
  return allDataSets;
}

export { getAwsAccountId };
