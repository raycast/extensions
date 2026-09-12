import { usePlanetScaleClient } from "../oauth/view";
import { useCachedPromise } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { enrichToastWithURL, mutation } from "../utils";

export function useBranches(args: { organization?: string; database?: string }) {
  const pscale = usePlanetScaleClient();

  const {
    data: branches,
    isLoading: branchesLoading,
    mutate,
  } = useCachedPromise(
    async (key, { organization, database }) => {
      const response = await pscale.listBranches({
        page: 1,
        per_page: 25,
        organization,
        database,
      });
      return response.data.data;
    },
    ["branches", args],
    {
      initialData: [],
      execute: !!args.organization && !!args.database,
    },
  );

  const deleteBranch = mutation(async (branch: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting branch`, message: branch });
    await mutate(
      pscale.deleteABranch({
        organization: args.organization!,
        database: args.database!,
        name: branch,
      }),
      {
        optimisticUpdate: (branches) => {
          return branches.filter((b) => b.name !== branch);
        },
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Branch deleted";
  });

  const createBranch = mutation(
    async (values: { name: string; parent: string; organization: string; database: string }) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating branch", message: values.name });

      const branchResponse = await mutate(
        pscale.createABranch(
          { name: values.name, parent_branch: values.parent },
          { database: values.database, organization: values.organization },
        ),
        {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          optimisticUpdate: (branches) => [
            ...branches,
            {
              id: Math.random().toString(),
              name: values.name,
              parent_branch: values.parent,
              html_url: branches[0].html_url.replace(branches[0].name, values.name),
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          ],
        },
      );

      toast.title = "Branch created";
      toast.style = Toast.Style.Success;
      enrichToastWithURL(toast, { resource: "Branch", url: branchResponse.data.html_url });
    },
  );

  const refreshBranches = async () => {
    await mutate();
  };

  return { branches, createBranch, deleteBranch, refreshBranches, branchesLoading, mutate };
}
