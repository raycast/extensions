import { usePromise } from "@raycast/utils";
import { getModel } from "../lib/replicate";
import { DAY_MS, cached } from "../lib/cache";

export const useModel = (id?: string) => {
  const [owner, name] = (id ?? "").split("/");
  return usePromise(
    (modelOwner: string, modelName: string) =>
      cached(`model:${modelOwner}/${modelName}`, DAY_MS, () => getModel(modelOwner, modelName)),
    [owner, name],
    { execute: Boolean(owner && name) },
  );
};
