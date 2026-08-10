import { List, Icon, ActionPanel, Action, Keyboard, useNavigation } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { Provider, Model } from "../lib/types";
import { getProviderCapabilityAccessories } from "../lib/accessories";
import { ModelsList } from "./ModelsList";

interface ProviderListItemProps {
  provider: Provider;
  providerModels: Model[];
}

export function ProviderListItem({ provider, providerModels }: ProviderListItemProps) {
  const { push } = useNavigation();

  // Capability indicators and model count
  const accessories = useMemo(() => {
    const acc = getProviderCapabilityAccessories(providerModels);
    acc.push({
      text: `${provider.modelCount} model${provider.modelCount !== 1 ? "s" : ""}`,
    });
    return acc;
  }, [providerModels, provider.modelCount]);

  // Push lazily via a callback instead of `Action.Push` with an eager `target`.
  // Raycast renders push targets, so eagerly building a full ModelsList per row
  // materialized every provider's model list at once and exhausted the JS heap.
  const handleViewModels = useCallback(() => {
    push(
      <ModelsList
        models={providerModels}
        navigationTitle={provider.name}
        searchBarPlaceholder={`Search ${provider.name} models...`}
        emptyDescription={`No models found for ${provider.name}`}
      />,
    );
  }, [push, providerModels, provider.name]);

  return (
    <List.Item
      title={provider.name}
      icon={{ source: provider.logo, fallback: Icon.Globe }}
      accessories={accessories}
      keywords={[provider.id]}
      actions={
        <ActionPanel>
          <Action title="View Models" icon={Icon.List} onAction={handleViewModels} />
          <Action.OpenInBrowser
            title="Open Documentation"
            url={provider.doc}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Provider ID"
            content={provider.id}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
