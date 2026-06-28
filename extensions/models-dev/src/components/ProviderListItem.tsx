import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useMemo } from "react";
import { Provider, Model } from "../lib/types";
import { getProviderCapabilityAccessories } from "../lib/accessories";

interface ProviderListItemProps {
  provider: Provider;
  providerModels: Model[];
  onSelect: (providerId: string) => void;
}

export function ProviderListItem({ provider, providerModels, onSelect }: ProviderListItemProps) {
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
          <Action title="View Models" icon={Icon.List} onAction={() => onSelect(provider.id)} />
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
