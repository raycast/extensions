import { useCachedPromise } from "@raycast/utils";
import klu from "../libs/klu";
import { PersistedAction, PersistedApp } from "@kluai/core";
import { useCallback, useState } from "react";

const useActions = () => {
  const [selectedApp, setSelectedApp] = useState<PersistedApp | undefined>(undefined);

  const hook = useCachedPromise(
    async (selectedApp?: string) => {
      const workspace = await klu.workspaces.getCurrent();
      const apps = await klu.workspaces.getApps(workspace.projectGuid);
      const actions = await klu.apps.getActions(selectedApp ?? apps[0].guid);

      interface Action extends PersistedAction {
        modelName: string | undefined;
      }

      const newActions = actions.map(async (_) => {
        const action: Action = {
          ..._,
          modelName: undefined,
        };

        const { modelId } = await klu.actions.get(_.guid);
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
        workspaceId: workspace.projectGuid,
        actions: await Promise.all(newActions),
      };

      return data;
    },
    [selectedApp?.guid],
    {
      keepPreviousData: true,
      initialData: {
        apps: [],
        workspaceId: "",
        actions: [],
      },
    },
  );

  const onChangeApp = useCallback((app: PersistedApp) => {
    if (app.guid === selectedApp?.guid) return;
    setSelectedApp(app);
    hook.revalidate();
  }, []);

  return { ...hook, onChangeApp };
};

export default useActions;
