import { List } from "@raycast/api";
import { useModels } from "./hooks/useModels";
import { useProviders } from "./hooks/useProviders";
import { ProviderDropdown } from "./components/ProviderDropdown";
import { SearchListItem } from "./components/SearchListItem";
import { useState, useMemo } from "react";

export default function Command() {
  const { data: allModels = [], isLoading, refresh } = useModels();
  const [selectedProvider, setSelectedProvider] = useState<string>("__all__");

  const providers = useProviders(allModels);

  // Filter models by selected provider
  const filteredModels = useMemo(() => {
    if (selectedProvider === "__all__") {
      return allModels;
    }
    return allModels.filter((model) => model.id.startsWith(selectedProvider + "/"));
  }, [allModels, selectedProvider]);

  // Sort models by creation date (newest first)
  const sortedModels = useMemo(() => [...filteredModels].sort((a, b) => b.created - a.created), [filteredModels]);

  const onProviderChange = (newValue: string) => {
    setSelectedProvider(newValue);
  };

  return (
    <List
      filtering
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Search OpenRouter models..."
      searchBarAccessory={<ProviderDropdown providers={providers} onProviderChange={onProviderChange} />}
    >
      {sortedModels.map((searchResult) => (
        <SearchListItem key={searchResult.id} refreshModels={refresh} searchResult={searchResult} />
      ))}
    </List>
  );
}
