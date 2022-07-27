import { IssueResult } from "../api/getIssues";
import { useCachedPromise, MutatePromise } from "@raycast/utils";

export default function useIssues<T>(
  fetcher: (...args: T[]) => Promise<IssueResult[] | undefined>,
  args: T[] = [],
  config?: { execute?: boolean; keepPreviousData?: boolean }
): {
  issues: IssueResult[] | undefined;
  issuesError: Error | undefined;
  isLoadingIssues: boolean;
  mutateList: MutatePromise<IssueResult[] | undefined>;
} {
  const { data, error, isLoading, mutate } = useCachedPromise(fetcher, args, config);

  return { issues: data, issuesError: error, isLoadingIssues: isLoading, mutateList: mutate };
}
