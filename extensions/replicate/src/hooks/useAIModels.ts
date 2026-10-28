import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  addModel,
  hiddenModelIds,
  hideModel,
  keptModels,
  refreshAIModels,
  removeModel,
  unhideModel,
} from "../lib/ai-models";
import { errorMessage } from "../lib/replicate";

export const useAIModels = () => {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const [kept, hidden] = await Promise.all([keptModels(), hiddenModelIds()]);
    return { kept, hidden };
  });

  const change = async (id: string, title: string, apply: () => Promise<void>) => {
    try {
      await apply();
      await refreshAIModels();
      revalidate();
      await showToast({ style: Toast.Style.Success, title, message: id });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Update Raycast AI",
        message: errorMessage(error),
      });
    }
  };

  return {
    kept: data?.kept ?? [],
    keptIds: (data?.kept ?? []).map((model) => model.id),
    hidden: data?.hidden ?? [],
    isLoading,
    revalidate,
    add: (id: string) =>
      change(id, "Added to Raycast AI", async () => {
        await addModel(id);
        await unhideModel(id);
      }),
    remove: (id: string) => change(id, "Removed from Raycast AI", () => removeModel(id)),
    hide: (id: string) => change(id, "Hidden from Raycast AI", () => hideModel(id)),
    unhide: (id: string) => change(id, "Shown in Raycast AI", () => unhideModel(id)),
  };
};
