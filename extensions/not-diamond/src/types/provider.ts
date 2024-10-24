import { ProviderModelMap } from "../constants/provider";

type ProviderModelMapType = typeof ProviderModelMap;
type SupportedProviderType = keyof ProviderModelMapType;
type ModelForProvider<T extends SupportedProviderType> = ProviderModelMapType[T][number];
export interface Provider<T extends SupportedProviderType = SupportedProviderType> {
  provider: T;
  model: ModelForProvider<T>;
  contextLength?: number;
  inputPrice?: number;
  outputPrice?: number;
  latency?: number;
  isCustom?: boolean;
}
