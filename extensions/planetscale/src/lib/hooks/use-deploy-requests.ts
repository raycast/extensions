import { getPlanetScaleClient } from "../oauth/view";
import { useCachedPromise } from "@raycast/utils";
import { mutation } from "../error";
import { showToast, Toast } from "@raycast/api";
import { enrichToastWithURL } from "../raycast";
import { range } from "lodash";

export function useDeployRequests(args: { organization?: string; database?: string }) {
  const pscale = getPlanetScaleClient();

  const {
    data: deployRequests,
    isLoading: deployRequestsLoading,
    mutate,
  } = useCachedPromise(
    async (key, { organization, database }) => {
      // Fetch multiple pages of deploy requests
      const jobs = range(1, 4).map((page) =>
        pscale.listDeployRequests({
          page,
          per_page: 100,
          organization,
          database,
        }),
      );
      const responses = await Promise.all(jobs);
      return responses.map((job) => job.data.data).flat();
    },
    ["deploy-requests", args],
    {
      initialData: [],
    },
  );

  const closeDeployRequest = mutation(async (id: string) => {
    const deployRequest = deployRequests.find((deployRequest) => deployRequest.id === id)!;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Closing deploy request`,
      message: `#${deployRequest.number}${deployRequest.notes ? `: ${deployRequest.notes}` : ""}`,
    });

    await mutate(
      pscale.closeADeployRequest(
        {
          state: "closed",
        },
        {
          database: args.database!,
          organization: args.organization!,
          number: deployRequest.number.toString(),
        },
      ),
      {
        optimisticUpdate: (deployRequests) => {
          return deployRequests.map((r) => {
            if (r.number === deployRequest.number) {
              return {
                ...r,
                state: "closed",
              };
            }
            return r;
          });
        },
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Deploy request closed";
  });

  const createDeployRequest = mutation(
    async (values: { branch: string; deploy: string; notes?: string; organization: string; database: string }) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating deploy request" });

      const deployRequest = await pscale.createADeployRequest(
        {
          branch: values.branch,
          into_branch: values.deploy,
          notes: values.notes,
        },
        { database: values.database, organization: values.organization },
      );
      toast.title = "Deploy request created";
      toast.style = Toast.Style.Success;
      enrichToastWithURL(toast, { resource: "Deploy Request", url: deployRequest.data.html_url });
    },
  );

  const refreshDeployRequests = async () => {
    await mutate();
  };

  return { deployRequests, createDeployRequest, closeDeployRequest, deployRequestsLoading, refreshDeployRequests };
}
