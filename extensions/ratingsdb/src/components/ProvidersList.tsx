import { useEffect, useState } from "react";
import { List, Image, ActionPanel, Action } from "@raycast/api";
import { getProviderIcon } from "../utils";
import { StreamingProvider, ProvidersListViewProps } from "../types";

export const ProvidersList = ({ providers, isLoading }: ProvidersListViewProps) => {
  const [groupedProviders, setGroupedProviders] = useState<Record<string, StreamingProvider[]>>({});

  useEffect(() => {
    const grouped = providers.reduce(
      (acc, provider) => {
        if (!acc[provider.type]) {
          acc[provider.type] = [];
        }
        acc[provider.type].push(provider);
        return acc;
      },
      {} as Record<string, StreamingProvider[]>,
    );
    setGroupedProviders(grouped);
  }, [providers]);

  return (
    <List isLoading={isLoading}>
      <List.EmptyView title="No providers found" />
      {!isLoading &&
        Object.entries(groupedProviders).map(([type, typeProviders]) => (
          <List.Section
            key={type}
            title={type === "sub" ? "Subscription" : type.charAt(0).toUpperCase() + type.slice(1)}
          >
            {typeProviders.map((provider) => (
              <List.Item
                key={provider.source_id}
                title={provider.name}
                subtitle={provider.price ? `${provider.price}` : undefined}
                icon={{ source: getProviderIcon(provider), mask: Image.Mask.RoundedRectangle }}
                accessories={[{ text: provider.format || "Unknown format" }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={provider.web_url} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
};
