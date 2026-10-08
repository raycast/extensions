import { useMemo } from "react";
import { useLicense } from "../license/useLicense";
import { configuredProviderIds, createProviders, partitionProviders } from "../providers/registry";
import { Provider, ProviderId } from "../providers/types";
import { ExtensionPreferences, getExtensionPreferences, runtimeHttp } from "./runtime";

export type ProvidersState = {
  prefs: ExtensionPreferences;
  /** Providers the user may query on their tier. */
  active: Provider[];
  activeIds: ProviderId[];
  /** Configured but locked behind Pro. */
  locked: ProviderId[];
  configured: ProviderId[];
  isPro: boolean;
  isLoading: boolean;
};

export function useProviders(): ProvidersState {
  const license = useLicense();
  const prefs = useMemo(getExtensionPreferences, []);
  return useMemo(() => {
    const configured = configuredProviderIds(prefs);
    const { active, locked } = partitionProviders(configured, license.isPro);
    return {
      prefs,
      active: createProviders(active, prefs, runtimeHttp()),
      activeIds: active,
      locked,
      configured,
      isPro: license.isPro,
      isLoading: license.isLoading,
    };
  }, [prefs, license.isPro, license.isLoading]);
}

/**
 * Rebuilds providers inside a cached promise. `useCachedPromise` keys its cache on the arguments, so hooks pass the
 * active provider IDs (plain strings) and rebuild instances here instead of passing class instances around.
 */
export function providersFor(ids: ProviderId[]): Provider[] {
  return createProviders(ids, getExtensionPreferences(), runtimeHttp());
}
