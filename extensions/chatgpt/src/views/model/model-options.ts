import { isModelId } from "../../utils/model-support";

export function getModelOptions(models: readonly string[]) {
  const values = new Set(models.filter(isModelId));
  return Array.from(values, (value) => ({ value, title: value }));
}
