import { PersistedAction, PersistedApp } from "@kluai/core";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useCallback } from "react";
import klu from "../libs/klu";
import useAbortController from "./use-abort";
import { useSelectedApplication } from "./use-application";
import useApplications from "./use-applications";

const useActions = () => {
  const { selectedApp, setSelectedApp } = useSelectedApplication();

  const abortable = useAbortController();

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
      execute: !isAppsLoading || !selectedApp || !apps,
      initialData: [],
      keepPreviousData: true,
      abortable: abortable.ref,
      onError: (error) => {
        showFailureToast(error);
        abortable.abort();
        abortable.renew();
      },
    },
  );

  const onChangeApp = useCallback((app: PersistedApp) => {
    if (!selectedApp) return;
    if (app.guid === selectedApp.guid) return;
    abortable.abort();
    abortable.renew();
    setSelectedApp(app);
  }, []);

  return { ...hook, isLoading: isAppsLoading || hook.isLoading, onChangeApp };
};

export default useActions;
