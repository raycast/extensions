import { isWorktreeDirty } from "#/helpers/file";
import { getCurrentCommit } from "#/helpers/git";
import { useCachedPromise, withCache } from "@raycast/utils";

const getBranchInformation = async (path: string) => {
  const [isDirty, commit] = await Promise.all([isWorktreeDirty(path), getCurrentCommit({ path })]);

  return { isDirty, commit: commit ?? undefined };
};

const cachedGetBranchInformation = withCache(getBranchInformation, {
  maxAge: 30 * 1000, // 30 seconds
});

export const useBranchInformation = ({ path }: { path: string }) => {
  const { data, isLoading, revalidate } = useCachedPromise(
    (path, _) => cachedGetBranchInformation(path),
    [path, "branch-information"],
    {
      keepPreviousData: true,
      execute: false,
    },
  );

  return {
    ...data,
    isLoadingBranchInformation: isLoading,
    revalidateBranchInformation: revalidate,
  };
};
