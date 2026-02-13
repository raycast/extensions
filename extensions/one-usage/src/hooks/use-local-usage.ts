import { useLocalStorage } from "@raycast/utils";

const PROVIDER_ORDER_KEY = "provider-order";
const SELECTED_PROVIDER_KEY = "selected-provider";
const LAST_UPDATED_KEY = "last-updated";

export const useLocalUsage = () => {
  const {
    isLoading: isProviderOrderLoading,
    value: providerOrder,
    setValue: setProviderOrder,
  } = useLocalStorage<string[]>(PROVIDER_ORDER_KEY, []);
  const {
    isLoading: isSelectedProviderLoading,
    value: selectedProvider,
    setValue: setSelectedProvider,
  } = useLocalStorage<string>(SELECTED_PROVIDER_KEY, "all");
  const {
    isLoading: isLastUpdatedLoading,
    value: lastUpdatedMs,
    setValue: setLastUpdatedMs,
  } = useLocalStorage<number | null>(LAST_UPDATED_KEY, null);

  const isLoading = isProviderOrderLoading || isSelectedProviderLoading || isLastUpdatedLoading;

  return {
    isLoading,
    providerOrder,
    selectedProvider,
    lastUpdatedMs,
    setProviderOrder,
    setSelectedProvider,
    setLastUpdatedMs,
  };
};
