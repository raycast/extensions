import type { ProviderCategory, ProviderSnapshot } from "../domain/types";

export interface ProviderAdapter {
  fetch(signal: AbortSignal): Promise<ProviderSnapshot>;
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
