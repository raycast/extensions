import { useCachedPromise } from "@raycast/utils";
import klu from "../libs/klu";
import { PersistedAction } from "@kluai/core";

const useActions = (actionGuid: string) => {
  const hook = useCachedPromise(
    async (actionGuid: string) => {
      const data = await klu.apps.getActions(actionGuid);

      interface Action extends PersistedAction {
        modelName: string | undefined;
      }

      const actions = data.map(async (_) => {
        const action: Action = {
          ..._,
          modelName: undefined,
        };

        const { modelId } = await klu.actions.get(_.guid);
        const { llm } = await klu.models.get(modelId);

        action.modelName = llm;

        return action;
      });

      const newActions = await Promise.all(actions);

      return newActions;
    },
    [actionGuid],
    {
      execute: actionGuid.length !== 0,
      keepPreviousData: true,
      initialData: [],
    },
  );

  return hook;
};

export default useActions;
