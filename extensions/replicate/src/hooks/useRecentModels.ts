import { useLocalStorage } from "@raycast/utils";
import { modelId } from "../lib/replicate";
import { Model } from "../types";

const LIMIT = 8;

export const useRecentModels = () => {
  const { value, setValue, isLoading } = useLocalStorage<Model[]>("recent-models", []);
  const recents = value ?? [];

  const remember = async (model: Model) => {
    // A stored schema would be stale next time and dwarfs everything else in local storage.
    const lite: Model = {
      owner: model.owner,
      name: model.name,
      description: model.description,
      cover_image_url: model.cover_image_url,
      run_count: model.run_count,
    };
    const rest = recents.filter((entry) => modelId(entry) !== modelId(model));
    await setValue([lite, ...rest].slice(0, LIMIT));
  };

  return { recents, remember, isLoading };
};
