import type { ProviderCategory } from "../domain/types";

export const PROVIDER_CATEGORY_TITLES: Record<ProviderCategory, string> = {
  "model-providers": "Model Providers",
  "routers-and-inference": "Routers & Inference",
  specialized: "Specialized Generation",
};

export const PROVIDER_CATEGORY_ORDER: readonly ProviderCategory[] = [
  "model-providers",
  "routers-and-inference",
  "specialized",
];
