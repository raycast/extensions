import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  Export,
  ListExportsCommand,
  ListStackResourcesCommand,
  ListStacksCommand,
  StackResourceSummary,
  StackSummary,
} from "@aws-sdk/client-cloudformation";
import { showToast, Toast } from "@raycast/api";
import { getCloudFormationClient } from "../services/clients/cloudformation";

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

async function fetchStacks(toast: Toast, maxResults = 500): Promise<StackSummary[]> {
  const stacks: StackSummary[] = [];
  let nextToken: string | undefined;

  do {
    const { NextToken: cursor, StackSummaries } = await getCloudFormationClient().send(
      new ListStacksCommand({ NextToken: nextToken }),
    );

    const filteredStacks = (StackSummaries ?? []).filter((s) => s.StackStatus !== "DELETE_COMPLETE");
    stacks.push(...filteredStacks);

    toast.message = `${stacks.length} stacks`;
    nextToken = cursor;
  } while (nextToken && stacks.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded stacks";
  toast.message = `${stacks.length} stacks`;
  return stacks;
}

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

async function fetchExports(toast: Toast, maxResults = 500): Promise<Export[]> {
  const exports: Export[] = [];
  let nextToken: string | undefined;

  do {
    const { NextToken: cursor, Exports } = await getCloudFormationClient().send(
      new ListExportsCommand({ NextToken: nextToken }),
    );

    const filteredExports = (Exports ?? []).filter((e) => e.Name && e.Value);
    exports.push(...filteredExports);

    toast.message = `${exports.length} exports`;
    nextToken = cursor;
  } while (nextToken && exports.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded exports";
  toast.message = `${exports.length} exports`;
  return exports;
}

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

async function fetchStackResources(stack: string, toast: Toast, maxResults = 500): Promise<StackResourceSummary[]> {
  const resources: StackResourceSummary[] = [];
  let nextToken: string | undefined;

  do {
    const { NextToken: cursor, StackResourceSummaries } = await getCloudFormationClient().send(
      new ListStackResourcesCommand({ NextToken: nextToken, StackName: stack }),
    );

    const filteredResources = (StackResourceSummaries ?? []).filter((r) => r.PhysicalResourceId);
    resources.push(...filteredResources);

    toast.message = `${resources.length} resources`;
    nextToken = cursor;
  } while (nextToken && resources.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded resources";
  toast.message = `${resources.length} resources`;
  return resources;
}
