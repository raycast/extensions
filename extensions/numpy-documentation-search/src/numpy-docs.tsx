import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useInventory } from "./hooks/useInventory";
import { useDocDetail } from "./hooks/useDocDetail";
import { type InventoryItem } from "./lib/inventory";
import { buildMarkdown, type DocDetail } from "./lib/doc-detail";
import { searchInventory } from "./lib/search";
import { applyPrefixPreference } from "./lib/prefix";

interface Preferences {
  useShortPrefix: boolean;
}

type DetailRenderState = {
  detail?: DocDetail;
  isLoading: boolean;
  error?: Error;
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const preferences = getPreferenceValues<Preferences>();

  const { data: inventory = [], isLoading: isLoadingInventory, error: inventoryError } = useInventory();

  const results = useMemo(() => searchInventory(inventory, searchText), [inventory, searchText]);

  useEffect(() => {
    if (results.length === 0) {
      setSelectedId(undefined);
      return;
    }

    setSelectedId((current) => {
      if (current && results.some((item) => item.id === current)) {
        return current;
      }
      return results[0]?.id;
    });
  }, [results]);

  const selectedItem = useMemo(() => results.find((item) => item.id === selectedId), [results, selectedId]);

  const { data: selectedDetail, isLoading: isLoadingDetail, error: selectedDetailError } = useDocDetail(selectedItem);

  const listIsLoading = isLoadingInventory;
  const noResults = !listIsLoading && results.length === 0;

  return (
    <List
      isLoading={listIsLoading}
      isShowingDetail
      searchBarPlaceholder="Search NumPy documentation..."
      onSearchTextChange={setSearchText}
      throttle
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      {inventoryError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load inventory"
          description={inventoryError.message}
        />
      ) : noResults ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No results" description="Try a different NumPy symbol." />
      ) : (
        results.map((item) => {
          const renderState: DetailRenderState =
            item.id === selectedItem?.id
              ? { detail: selectedDetail, isLoading: isLoadingDetail, error: selectedDetailError }
              : { detail: undefined, isLoading: false };

          const detailMarkdown = getDetailMarkdown(item, renderState, preferences.useShortPrefix);

          return (
            <List.Item
              key={item.id}
              id={item.id}
              title={applyPrefixPreference(item.shortName, preferences.useShortPrefix)}
              subtitle={applyPrefixPreference(item.name, preferences.useShortPrefix)}
              accessories={[{ text: item.role.replace("py:", "") }]}
              icon={Icon.Book}
              detail={<List.Item.Detail markdown={detailMarkdown} />}
              actions={
                <ItemActions item={item} detail={renderState.detail} useShortPrefix={preferences.useShortPrefix} />
              }
            />
          );
        })
      )}
    </List>
  );
}

function getDetailMarkdown(item: InventoryItem, state: DetailRenderState, useShortPrefix: boolean): string {
  if (state.isLoading) {
    return "Loading details...";
  }

  if (state.error) {
    return `Failed to load documentation.\\n\\n${state.error.message}`;
  }

  if (!state.detail) {
    return "Select an entry to load its documentation.";
  }

  return buildMarkdown(item, state.detail, useShortPrefix);
}

function ItemActions({
  item,
  detail,
  useShortPrefix,
}: {
  item: InventoryItem;
  detail?: DocDetail;
  useShortPrefix: boolean;
}) {
  const displayName = applyPrefixPreference(item.name, useShortPrefix);
  const signature = detail?.signature ? applyPrefixPreference(detail.signature, useShortPrefix) : undefined;

  return (
    <ActionPanel>
      <Action.Push
        title="View Full Documentation"
        icon={Icon.Document}
        target={<FullScreenDocumentation item={item} detail={detail} useShortPrefix={useShortPrefix} />}
      />
      <Action.OpenInBrowser title="Open in Browser" url={item.url} />
      <Action.CopyToClipboard title="Copy URL" content={item.url} />
      <Action.CopyToClipboard title="Copy Item Name" content={displayName} />
      {signature ? <Action.CopyToClipboard title="Copy Signature" content={signature} /> : null}
    </ActionPanel>
  );
}

function FullScreenDocumentation({
  item,
  detail,
  useShortPrefix,
}: {
  item: InventoryItem;
  detail?: DocDetail;
  useShortPrefix: boolean;
}) {
  const markdown = detail ? buildMarkdown(item, detail, useShortPrefix) : "Loading documentation...";
  const displayName = applyPrefixPreference(item.name, useShortPrefix);
  const displayShortName = applyPrefixPreference(item.shortName, useShortPrefix);
  const signature = detail?.signature ? applyPrefixPreference(detail.signature, useShortPrefix) : undefined;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={displayShortName}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={item.url} />
          <Action.CopyToClipboard title="Copy URL" content={item.url} />
          <Action.CopyToClipboard title="Copy Item Name" content={displayName} />
          {signature ? <Action.CopyToClipboard title="Copy Signature" content={signature} /> : null}
        </ActionPanel>
      }
    />
  );
}
