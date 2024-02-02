import { useCachedPromise } from "@raycast/utils";
import { PersistedAction, PersistedApp } from "@kluai/core";
import { useCallback, useState } from "react";
import klu from "../libs/klu";
import useWorkspace from "./use-workspace";

const useActions = () => {
  const [selectedApp, setSelectedApp] = useState<PersistedApp | undefined>(undefined);

  const { data: workspace, isLoading: isWorkspaceLoading } = useWorkspace();

  const hook = useCachedPromise(
    async (workspaceProjectGuid: string, selectedAppGuid?: string) => {
      const apps = await klu.workspaces.getApps(workspaceProjectGuid);
      const actions = await klu.apps.getActions(selectedAppGuid ?? apps[0].guid);

      if (!selectedAppGuid) {
        setSelectedApp(apps[0]);
      }
      interface Action extends PersistedAction {
        modelName: string | undefined;
      }

      const newActions = actions.map(async (a) => {
        const action: Action = {
          ...a,
          modelName: undefined,
        };

        const { modelId } = await klu.actions.get(a.guid);
        const { llm } = await klu.models.get(modelId);

        action.modelName = llm;

        return action;
      });

      const data = {
        apps: apps
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .sort((a, b) => {
            if (a.name < b.name) {
              return -1;
            }
            if (a.name > b.name) {
              return 1;
            }
            return 0;
          }),
        actions: await Promise.all(newActions),
      };

      return data;
    },
    [workspace.projectGuid, selectedApp?.guid],
    {
      execute: !!selectedApp || !isWorkspaceLoading || !workspace.projectGuid,
      keepPreviousData: true,
      initialData: {
        apps: [],
        actions: [],
      },
    },
  );

  const onChangeApp = useCallback((app: PersistedApp) => {
    if (app.guid === selectedApp?.guid) return;
    setSelectedApp(app);
    hook.revalidate();
  }, []);

  return { ...hook, isLoading: isWorkspaceLoading || hook.isLoading, onChangeApp };
};

export default useActions;
