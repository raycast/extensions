import { Action, ActionPanel, AI, Icon, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { type CatalogModel, displayName, fetchCatalog, formatPrice } from "./catalog";

export default function Command() {
  const [models, setModels] = useState<CatalogModel[]>();
  const [error, setError] = useState<string>();

  async function load() {
    const { apiKey } = getPreferenceValues<Preferences>();
    try {
      setModels(await fetchCatalog(apiKey.trim()));
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await showToast({ style: Toast.Style.Failure, title: "Could not load models", message: String(e) });
    }
  }

  async function reload() {
    setModels(undefined);
    setError(undefined);
    await load();
    await AI.refreshModels();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <List isLoading={!models && !error} searchBarPlaceholder="Search Obscurify.ai models">
      {error && !models ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load models"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={reload} />
            </ActionPanel>
          }
        />
      ) : null}
      {models?.map((model) => (
        <List.Item
          key={model.id}
          icon="icon.png"
          title={displayName(model)}
          subtitle={model.id}
          keywords={[model.id]}
          accessories={[
            ...(model.tools ? [{ tag: "Tools" }] : []),
            ...(model.context_length ? [{ text: `${Math.round(model.context_length / 1000)}K ctx` }] : []),
            ...(formatPrice(model) ? [{ icon: Icon.Coins, tooltip: formatPrice(model) }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Model ID" content={model.id} />
              <Action title="Refresh Models" icon={Icon.ArrowClockwise} onAction={reload} />
              <Action.OpenInBrowser
                title="Open Model Prices"
                url="https://obscurify.ai/model_cards?utm_source=raycast"
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
