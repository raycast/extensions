import { useMemo } from "react";
import type { Model, ModelHook } from "../type";
import { modelCatalog, saveConfiguration, useModelCatalog } from "./useModelCatalog";
import { DEFAULT_MODEL } from "../utils/model-defaults";
export { DEFAULT_MODEL } from "../utils/model-defaults";

const actions = {
  add: (model: Model) => saveConfiguration(() => modelCatalog.saveModel(model), "Model saved"),
  update: (model: Model) => saveConfiguration(() => modelCatalog.saveModel(model), "Model updated"),
  remove: (model: Model) => saveConfiguration(() => modelCatalog.removeModel(model), "Model removed"),
  clear: () => saveConfiguration(() => modelCatalog.setModels({ default: DEFAULT_MODEL }), "Models cleared"),
  setModels: modelCatalog.setModels,
  importModels: modelCatalog.importModels,
};

export function useModel(): ModelHook {
  const { models: data, isLoading } = useModelCatalog();
  return useMemo(() => ({ data, isLoading, ...actions }), [data, isLoading]);
}
