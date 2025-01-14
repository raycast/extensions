import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  CloudFormationClient,
  Export,
  ListExportsCommand,
  ListStackResourcesCommand,
  ListStacksCommand,
  StackResourceSummary,
  StackSummary,
} from "@aws-sdk/client-cloudformation";
import { showToast, Toast } from "@raycast/api";

export const useStacks = () => {
  const {
    data: stacks,
    error,
    isLoading,
    mutate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading stacks" });
      return await fetchStacks(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load stacks" } },
  );

  return { stacks, error, isLoading: (!stacks && !error) || isLoading, mutate };
};

const fetchStacks = async (toast: Toast, nextToken?: string, aggregate?: StackSummary[]): Promise<StackSummary[]> => {
  const { NextToken: cursor, StackSummaries } = await new CloudFormationClient({}).send(
    new ListStacksCommand({ NextToken: nextToken }),
  );

  const stacks = (StackSummaries ?? []).filter((s) => s.StackStatus !== "DELETE_COMPLETE");

  const agg = [...(aggregate ?? []), ...stacks];
  toast.message = `${agg.length} stacks`;
  if (cursor) {
    return await fetchStacks(toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded stacks";
  toast.message = `${agg.length} stacks`;
  return agg;
};

export const useExports = () => {
  const {
    data: exports,
    error,
    isLoading,
    mutate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading exports" });
      return await fetchExports(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load exports" } },
  );

  return { exports, error, isLoading: (!exports && !error) || isLoading, mutate };
};

const fetchExports = async (toast: Toast, nextToken?: string, aggregate?: Export[]): Promise<Export[]> => {
  const { NextToken: cursor, Exports } = await new CloudFormationClient({}).send(
    new ListExportsCommand({ NextToken: nextToken }),
  );

  const exports = (Exports ?? []).filter((e) => e.Name && e.Value);

  const agg = [...(aggregate ?? []), ...exports];
  toast.message = `${agg.length} exports`;
  if (cursor) {
    return await fetchExports(toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded exports";
  toast.message = `${agg.length} exports`;
  return agg;
};

export const useStackResources = (stackName: string) => {
  const {
    data: resources,
    error,
    isLoading,
  } = useCachedPromise(
    async (stack: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading resources" });
      return await fetchStackResources(stack, toast);
    },
    [stackName],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load stack resources" } },
  );

  return { resources, error, isLoading: (!resources && !error) || isLoading };
};

const fetchStackResources = async (
  stack: string,
  toast: Toast,
  nextToken?: string,
  aggregate?: StackResourceSummary[],
): Promise<StackResourceSummary[]> => {
  const { NextToken: cursor, StackResourceSummaries } = await new CloudFormationClient({}).send(
    new ListStackResourcesCommand({ NextToken: nextToken, StackName: stack }),
  );

  const resources = (StackResourceSummaries ?? []).filter((r) => r.PhysicalResourceId);

  const agg = [...(aggregate ?? []), ...resources];
  toast.message = `${agg.length} resource`;
  if (cursor) {
    return await fetchStackResources(stack, toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded resources";
  toast.message = `${agg.length} resources`;
  return agg;
};
