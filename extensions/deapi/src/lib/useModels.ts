import { showFailureToast, useCachedPromise } from "@raycast/utils";
import type { InferenceType, Model } from "./api";
import { getClient } from "./files";

/** Loads the account's models for the given task types, cached between runs. */
export function useModels(types: InferenceType[], sort: (models: Model[]) => Model[]) {
  const { data, isLoading } = useCachedPromise(
    async (key: string) => sort(await getClient().listModels(key.split(",") as InferenceType[])),
    [types.join(",")],
    {
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Could not load deAPI models" });
      },
    },
  );
  return { models: data ?? [], isLoading };
}

export function findModel(models: Model[], slug?: string): Model | undefined {
  return models.find((model) => model.slug === slug) ?? models[0];
}
