import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { InferenceType, Model } from "./api";
import { getClient } from "./files";

/** Loads the account's models for the given task types, cached between runs. */
export function useModels(types: InferenceType[], sort: (models: Model[]) => Model[]) {
  const { data, isLoading, error } = useCachedPromise(
    async (key: string) => sort(await getClient().listModels(key.split(",") as InferenceType[])),
    [types.join(",")],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Could not load deAPI models" },
    },
  );
  const models = data ?? [];
  return { models, isLoading, error, noModels: !isLoading && models.length === 0 };
}

export function findModel(models: Model[], slug?: string): Model | undefined {
  return models.find((model) => model.slug === slug) ?? models[0];
}

export const NO_MODELS_MESSAGE =
  "No models for this task are available to your deAPI account. Check your API key and connection, then reopen the command.";

/** Explains why a form can't be submitted when no model could be loaded. */
export async function showNoModelsToast() {
  await showToast({ style: Toast.Style.Failure, title: "No deAPI models available", message: NO_MODELS_MESSAGE });
}
