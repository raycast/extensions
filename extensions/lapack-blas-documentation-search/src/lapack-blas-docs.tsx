import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useInventory } from "./hooks/useInventory";
import { useDocDetail } from "./hooks/useDocDetail";
import { type InventoryItem } from "./lib/inventory";
import { buildMarkdown, type DocDetail } from "./lib/doc-detail";
import { searchInventory } from "./lib/search";

type DetailRenderState = {
  detail?: DocDetail;
  isLoading: boolean;
  error?: Error;
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

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
      searchBarPlaceholder="Search LAPACK/BLAS documentation..."
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
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results"
          description="Try a different LAPACK/BLAS routine name."
        />
      ) : (
        results.map((item) => {
          const renderState: DetailRenderState =
            item.id === selectedItem?.id
              ? { detail: selectedDetail, isLoading: isLoadingDetail, error: selectedDetailError }
              : { detail: undefined, isLoading: false };

          const detailMarkdown = getDetailMarkdown(item, renderState);

          return (
            <List.Item
              key={item.id}
              id={item.id}
              title={item.name}
              subtitle={item.description}
              accessories={[{ text: item.category }]}
              icon={Icon.Book}
              detail={<List.Item.Detail markdown={detailMarkdown} />}
              actions={<ItemActions item={item} detail={renderState.detail} />}
            />
          );
        })
      )}
    </List>
  );
}

function getDetailMarkdown(item: InventoryItem, state: DetailRenderState): string {
  if (state.isLoading) {
    return "Loading documentation...";
  }

  if (state.error) {
    return `Failed to load documentation.\n\n${state.error.message}`;
  }

  if (!state.detail) {
    return "Select an entry to load its documentation.";
  }

  return buildMarkdown(item, state.detail);
}

function ItemActions({ item, detail }: { item: InventoryItem; detail?: DocDetail }) {
  return (
    <ActionPanel>
      <Action.Push
        title="View Full Documentation"
        icon={Icon.Document}
        target={<FullScreenDocumentation item={item} detail={detail} />}
      />
      <Action.OpenInBrowser title="Open in Browser" url={item.url} />
      {detail?.signature && (
        <Action.CopyToClipboard
          title="Copy Function Signature"
          content={detail.signature}
          shortcut={{ modifiers: ["shift"], key: "return" }}
        />
      )}
      <Action.CopyToClipboard title="Copy URL" content={item.url} />
      <Action.CopyToClipboard title="Copy Routine Name" content={item.name} />
    </ActionPanel>
  );
}

function FullScreenDocumentation({ item, detail }: { item: InventoryItem; detail?: DocDetail }) {
  const markdown = detail ? buildMarkdown(item, detail) : "Loading documentation...";

  return (
    <Detail
      markdown={markdown}
      navigationTitle={item.name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={item.url} />
          <Action.CopyToClipboard title="Copy URL" content={item.url} />
          {detail?.signature && (
            <Action.CopyToClipboard
              title="Copy Function Signature"
              content={detail.signature}
              shortcut={{ modifiers: ["shift"], key: "return" }}
            />
          )}
          <Action.CopyToClipboard title="Copy Routine Name" content={item.name} />
        </ActionPanel>
      }
    />
  );
}
