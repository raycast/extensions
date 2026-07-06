import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useMemo } from "react";
import { Provider, Model } from "../lib/types";
import { getProviderCapabilityAccessories } from "../lib/accessories";
import { ModelsList } from "./ModelsList";

interface ProviderListItemProps {
  provider: Provider;
  providerModels: Model[];
}

export function ProviderListItem({ provider, providerModels }: ProviderListItemProps) {
  // Capability indicators and model count
  const accessories = useMemo(() => {
    const acc = getProviderCapabilityAccessories(providerModels);
    acc.push({
      text: `${provider.modelCount} model${provider.modelCount !== 1 ? "s" : ""}`,
    });
    return acc;
  }, [providerModels, provider.modelCount]);

  return (
    <List.Item
      title={provider.name}
      icon={{ source: provider.logo, fallback: Icon.Globe }}
      accessories={accessories}
      keywords={[provider.id]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Models"
            icon={Icon.List}
            target={
              <ModelsList
                models={providerModels}
                navigationTitle={provider.name}
                searchBarPlaceholder={`Search ${provider.name} models...`}
                emptyDescription={`No models found for ${provider.name}`}
              />
            }
          />
          <Action.OpenInBrowser
            title="Open Documentation"
            url={provider.doc}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Provider ID"
            content={provider.id}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
