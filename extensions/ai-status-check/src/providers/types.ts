import type { ComponentHistory, ProviderCategory, ProviderSnapshot } from "../domain/types";

export interface ProviderAdapter {
  fetch(signal: AbortSignal): Promise<ProviderSnapshot>;
  /** Optional lazy path for providers that expose history only on per-component pages. */
  fetchComponentHistory?(componentId: string, signal: AbortSignal): Promise<ComponentHistory | undefined>;
}

export interface ProviderAdapterConfig {
  providerId: string;
  statusPageUrl: string;
  now?: () => Date;
}

export type ProviderAdapterFactory<Config extends ProviderAdapterConfig> = (config: Config) => ProviderAdapter;

export interface ProviderDefinition<PreferenceKey extends string = string> {
  id: string;
  name: string;
  aliases: string[];
  category: ProviderCategory;
  preferenceKey: PreferenceKey;
  icon: string;
  statusPageUrl: string;
  adapter: ProviderAdapter;
}
