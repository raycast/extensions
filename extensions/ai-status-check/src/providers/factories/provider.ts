import { withTrailingSlash } from "../../utils/url";
import type { ProviderAdapterConfig, ProviderAdapterFactory, ProviderDefinition } from "../types";

type RuntimeOption = "providerId" | "statusPageUrl" | "now" | "fetchJson" | "fetchText";
type AdapterOptions<Config extends ProviderAdapterConfig> = Omit<Config, RuntimeOption>;
type RequiredKeys<Value> = {
  [Key in keyof Value]-?: Record<string, never> extends Pick<Value, Key> ? never : Key;
}[keyof Value];
type AdapterOptionsArgument<Config extends ProviderAdapterConfig> =
  RequiredKeys<AdapterOptions<Config>> extends never
    ? [options?: AdapterOptions<Config>]
    : [options: AdapterOptions<Config>];

export type ProviderMetadata<PreferenceKey extends string> = Omit<ProviderDefinition<PreferenceKey>, "adapter">;

/**
 * Connects catalog metadata to an adapter without repeating provider IDs or
 * normalized status-page URLs in every provider module.
 *
 * Adapter-specific options remain available for framework variations while
 * request and clock injection stay on adapters for isolated tests.
 */
export function createProvider<PreferenceKey extends string, Config extends ProviderAdapterConfig>(
  metadata: ProviderMetadata<PreferenceKey>,
  createAdapter: ProviderAdapterFactory<Config>,
  ...[options]: AdapterOptionsArgument<Config>
): ProviderDefinition<PreferenceKey> {
  const statusPageUrl = withTrailingSlash(metadata.statusPageUrl);
  const adapterConfig = {
    ...options,
    providerId: metadata.id,
    statusPageUrl,
  } as Config;

  return {
    ...metadata,
    statusPageUrl,
    adapter: createAdapter(adapterConfig),
  };
}
