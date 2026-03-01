import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { Provider, Model } from "../lib/types";
import { getProviderCapabilityAccessories } from "../lib/accessories";

interface ProviderListItemProps {
  provider: Provider;
  providerModels: Model[];
  onSelect: (providerId: string) => void;
}

export function ProviderListItem({ provider, providerModels, onSelect }: ProviderListItemProps) {
  // Capability indicators
  const accessories: List.Item.Accessory[] = getProviderCapabilityAccessories(providerModels);

  // Model count
  accessories.push({
    text: `${provider.modelCount} model${provider.modelCount !== 1 ? "s" : ""}`,
  });

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
