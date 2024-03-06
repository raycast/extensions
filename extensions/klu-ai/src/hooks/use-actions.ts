import { PersistedAction } from "@kluai/core";
import { useCachedPromise } from "@raycast/utils";
import klu from "../libs/klu";
import { useSelectedApplication } from "./use-application";
import useApplications from "./use-applications";
import { useMemo } from "react";

const useActions = () => {
  const { selectedApp, setSelectedApp } = useSelectedApplication();

  const { data: apps, isLoading: isAppsLoading } = useApplications();

  const hook = useCachedPromise(
    async (selectedAppGuid?: string) => {
      if (selectedAppGuid === undefined || apps === undefined) return [];

      const actions = await klu.apps.getActions(selectedAppGuid);

      if (selectedApp === undefined) {
        setSelectedApp(apps[0]);
      }

      interface Action extends PersistedAction {
        modelName: string | undefined;
      }

      const newActions = actions
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .sort((a) => (a.status === "ACTIVE" ? -1 : 1))
        .map(async (a) => {
          const action: Action = {
            ...a,
            modelName: undefined,
          };

          const { modelId } = await klu.actions.get(a.guid);
          const { llm } = await klu.models.get(modelId);

          action.modelName = llm;

          return action;
        });

      return await Promise.all(newActions);
    },
    [selectedApp ? selectedApp.guid : apps?.[0].guid],
    {
      execute: !isAppsLoading || !apps,
      initialData: [],
      keepPreviousData: true,
    },
  );

  return useMemo(() => ({ ...hook, isLoading: isAppsLoading || hook.isLoading }), [hook, isAppsLoading]);
};

export default useActions;
