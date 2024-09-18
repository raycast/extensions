import { usePlanetScaleClient } from "../oauth/view";
import { useCachedPromise } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { enrichToastWithURL, mutation } from "../utils";
import { range } from "lodash";

export function useDeployRequests(args: { organization?: string; database?: string }) {
  const pscale = usePlanetScaleClient();

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
      execute: !!args.organization && !!args.database,
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

  const deployChanges = mutation(async (id: string) => {
    const deployRequest = deployRequests.find((deployRequest) => deployRequest.id === id)!;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deploying changes`,
      message: `#${deployRequest.number}${deployRequest.notes ? `: ${deployRequest.notes}` : ""}`,
    });

    await mutate(
      pscale.queueADeployRequest({
        organization: args.organization!,
        database: args.database!,
        number: deployRequest.number.toString(),
      }),
      {
        optimisticUpdate: (deployRequests) => {
          return deployRequests.map((r) => {
            if (r.number === deployRequest.number) {
              return {
                ...r,
                deployment_state: "queued",
              };
            }
            return r;
          });
        },
      },
    );

    toast.style = Toast.Style.Success;
    toast.title = "Changes deployed";
  });

  const revertChanges = mutation(async (id: string) => {
    const deployRequest = deployRequests.find((deployRequest) => deployRequest.id === id)!;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Reverting changes`,
      message: `#${deployRequest.number}${deployRequest.notes ? `: ${deployRequest.notes}` : ""}`,
    });
    await mutate(
      pscale.completeARevert({
        organization: args.organization!,
        database: args.database!,
        number: deployRequest.number.toString(),
      }),
      {
        optimisticUpdate: (deployRequests) => {
          return deployRequests.map((r) => {
            if (r.number === deployRequest.number) {
              return {
                ...r,
                deployment_state: "in_progress_revert",
              };
            }
            return r;
          });
        },
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Changes reverted";
  });

  const skipRevertPeriod = mutation(async (id: string) => {
    const deployRequest = deployRequests.find((deployRequest) => deployRequest.id === id)!;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Skipping revert period",
      message: `#${deployRequest.number}${deployRequest.notes ? `: ${deployRequest.notes}` : ""}`,
    });
    await mutate(
      pscale.skipRevertPeriod({
        organization: args.organization!,
        database: args.database!,
        number: deployRequest.number.toString(),
      }),
      {
        optimisticUpdate: (deployRequests) => {
          return deployRequests.map((r) => {
            if (r.number === deployRequest.number) {
              return {
                ...r,
                deployment_state: "complete",
              };
            }
            return r;
          });
        },
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Revert period skipped";
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

  return {
    deployRequests,
    deployChanges,
    revertChanges,
    skipRevertPeriod,
    createDeployRequest,
    closeDeployRequest,
    deployRequestsLoading,
    refreshDeployRequests,
  };
}
