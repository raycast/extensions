import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  CloudFormationClient,
  ListExportsCommand,
  ListStackResourcesCommand,
  ListStacksCommand,
} from "@aws-sdk/client-cloudformation";

export const useStacks = () => {
  const {
    data: stacks,
    error,
    isLoading,
    revalidate,
    pagination,
  } = useCachedPromise(
    () =>
      async ({ page, cursor }: { page: number; cursor?: string }) => {
        const { NextToken, StackSummaries } = await new CloudFormationClient({}).send(
          new ListStacksCommand({ NextToken: cursor }),
        );

        const keyedStacks = (StackSummaries ?? [])
          .filter((s) => s.StackStatus !== "DELETE_COMPLETE")
          .map((s) => ({ ...s, stackKey: `#${page}-${s.StackId}` }));
        return { data: keyedStacks, hasMore: !!NextToken, cursor: NextToken };
      },
    [],
    { execute: isReadyToFetch() },
  );

  return { stacks, pagination, error, isLoading: (!stacks && !error) || isLoading, revalidate };
};

export const useExports = () => {
  const {
    data: exports,
    error,
    isLoading,
    revalidate,
    pagination,
  } = useCachedPromise(
    () =>
      async ({ page, cursor }: { page: number; cursor?: string }) => {
        const { NextToken, Exports } = await new CloudFormationClient({}).send(
          new ListExportsCommand({ NextToken: cursor }),
        );

        const keyedExports = (Exports ?? []).map((e) => ({ ...e, exportKey: `#${page}-${e.Name}` }));
        return { data: keyedExports, hasMore: !!NextToken, cursor: NextToken };
      },
    [],
    { execute: isReadyToFetch() },
  );

  return { exports, pagination, error, isLoading: (!exports && !error) || isLoading, revalidate };
};

export const useStackResources = (stackName: string) => {
  const {
    data: resources,
    error,
    isLoading,
    pagination,
  } = useCachedPromise(
    (stack: string) =>
      async ({ page, cursor }: { page: number; cursor?: string }) => {
        const { NextToken, StackResourceSummaries } = await new CloudFormationClient({}).send(
          new ListStackResourcesCommand({ NextToken: cursor, StackName: stack }),
        );

        const keyedStackResources = (StackResourceSummaries ?? []).map((s) => ({
          ...s,
          resourceKey: `#${page}-${s.LogicalResourceId}`,
        }));
        return { data: keyedStackResources, hasMore: !!NextToken, cursor: NextToken };
      },
    [stackName],
    { execute: isReadyToFetch() },
  );

  return { resources, pagination, error, isLoading: (!resources && !error) || isLoading };
};
