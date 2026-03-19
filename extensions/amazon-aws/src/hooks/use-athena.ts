import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  ListWorkGroupsCommand,
  ListNamedQueriesCommand,
  ListQueryExecutionsCommand,
  BatchGetNamedQueryCommand,
  BatchGetQueryExecutionCommand,
  WorkGroupSummary,
  NamedQuery,
  QueryExecution,
} from "@aws-sdk/client-athena";
import { showToast, Toast } from "@raycast/api";
import { getAthenaClient } from "../services/clients/athena";

export const useAthenaWorkGroups = () => {
  const {
    data: workGroups,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading work groups" });
      return await fetchWorkGroups(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load work groups" } },
  );

  return { workGroups, error, isLoading: (!workGroups && !error) || isLoading, revalidate };
};

export const useAthenaNamedQueries = () => {
  const {
    data: namedQueries,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading named queries" });
      return await fetchNamedQueries(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load named queries" } },
  );

  return { namedQueries, error, isLoading: (!namedQueries && !error) || isLoading, revalidate };
};

export const useAthenaQueryExecutions = () => {
  const {
    data: queryExecutions,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading query executions" });
      return await fetchQueryExecutions(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load query executions" } },
  );

  return { queryExecutions, error, isLoading: (!queryExecutions && !error) || isLoading, revalidate };
};

async function fetchWorkGroups(toast: Toast, maxResults = 100): Promise<WorkGroupSummary[]> {
  const client = getAthenaClient();
  const allWorkGroups: WorkGroupSummary[] = [];
  let nextToken: string | undefined;

  do {
    const { WorkGroups, NextToken } = await client.send(
      new ListWorkGroupsCommand({
        NextToken: nextToken,
        MaxResults: Math.min(maxResults - allWorkGroups.length, 50),
      }),
    );

    allWorkGroups.push(...(WorkGroups ?? []));
    toast.message = `${allWorkGroups.length} work groups`;
    nextToken = NextToken;
  } while (nextToken && allWorkGroups.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded work groups";
  toast.message = `${allWorkGroups.length} work groups`;
  return allWorkGroups;
}

async function fetchNamedQueries(toast: Toast, maxResults = 100): Promise<NamedQuery[]> {
  const client = getAthenaClient();
  const allQueryIds: string[] = [];
  let nextToken: string | undefined;

  do {
    const { NamedQueryIds, NextToken } = await client.send(
      new ListNamedQueriesCommand({
        NextToken: nextToken,
        MaxResults: Math.min(maxResults - allQueryIds.length, 50),
      }),
    );

    allQueryIds.push(...(NamedQueryIds ?? []));
    toast.message = `${allQueryIds.length} query IDs`;
    nextToken = NextToken;
  } while (nextToken && allQueryIds.length < maxResults);

  if (allQueryIds.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "✅ Loaded named queries";
    toast.message = "0 named queries";
    return [];
  }

  const allNamedQueries: NamedQuery[] = [];
  for (let i = 0; i < allQueryIds.length; i += 50) {
    const batch = allQueryIds.slice(i, i + 50);
    const { NamedQueries } = await client.send(new BatchGetNamedQueryCommand({ NamedQueryIds: batch }));
    allNamedQueries.push(...(NamedQueries ?? []));
    toast.message = `${allNamedQueries.length} named queries`;
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded named queries";
  toast.message = `${allNamedQueries.length} named queries`;
  return allNamedQueries;
}

async function fetchQueryExecutions(toast: Toast, maxResults = 50): Promise<QueryExecution[]> {
  const client = getAthenaClient();
  const allExecutionIds: string[] = [];
  let nextToken: string | undefined;

  do {
    const { QueryExecutionIds, NextToken } = await client.send(
      new ListQueryExecutionsCommand({
        NextToken: nextToken,
        MaxResults: Math.min(maxResults - allExecutionIds.length, 50),
      }),
    );

    allExecutionIds.push(...(QueryExecutionIds ?? []));
    toast.message = `${allExecutionIds.length} execution IDs`;
    nextToken = NextToken;
  } while (nextToken && allExecutionIds.length < maxResults);

  if (allExecutionIds.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "✅ Loaded query executions";
    toast.message = "0 query executions";
    return [];
  }

  const allExecutions: QueryExecution[] = [];
  for (let i = 0; i < allExecutionIds.length; i += 50) {
    const batch = allExecutionIds.slice(i, i + 50);
    const { QueryExecutions } = await client.send(new BatchGetQueryExecutionCommand({ QueryExecutionIds: batch }));
    allExecutions.push(...(QueryExecutions ?? []));
    toast.message = `${allExecutions.length} query executions`;
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded query executions";
  toast.message = `${allExecutions.length} query executions`;
  return allExecutions;
}
