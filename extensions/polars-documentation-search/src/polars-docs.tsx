import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useInventory } from "./hooks/useInventory";
import { useDocDetail } from "./hooks/useDocDetail";
import { type InventoryItem } from "./lib/inventory";
import { buildMarkdown, type DocDetail } from "./lib/doc-detail";
import { searchInventory } from "./lib/search";
import { applyPrefixPreference } from "./lib/prefix";
import { type ResolvedDocumentationSource } from "./lib/docs-source";

type DetailRenderState = {
  detail?: DocDetail;
  isLoading: boolean;
  error?: Error;
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const preferences = getPreferenceValues<Preferences>();

  const {
    data: inventory = [],
    isLoading: isLoadingInventory,
    error: inventoryError,
    source: inventorySource,
    remoteError: inventoryRemoteError,
    revalidate: revalidateInventory,
  } = useInventory();
  const visibleInventory = useMemo(() => {
    if (!preferences.hideApiItems) {
      return inventory;
    }

    return inventory.filter((item) => !item.shortName.toLowerCase().startsWith("api"));
  }, [inventory, preferences.hideApiItems]);

  const results = useMemo(() => searchInventory(visibleInventory, searchText), [visibleInventory, searchText]);

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

  const {
    data: selectedDetail,
    isLoading: isLoadingDetail,
    error: selectedDetailError,
    remoteError: selectedDetailRemoteError,
  } = useDocDetail(selectedItem, inventorySource);

  const listIsLoading = isLoadingInventory;
  const noResults = !listIsLoading && results.length === 0;

  return (
    <List
      isLoading={listIsLoading}
      isShowingDetail
      searchBarPlaceholder="Search Polars documentation..."
      onSearchTextChange={setSearchText}
      throttle
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      {inventoryError ? (
        <RecoveryItem error={inventoryError} onRetry={revalidateInventory} />
      ) : noResults ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No results" description="Try a different Polars symbol." />
      ) : (
        results.map((item) => {
          const renderState: DetailRenderState =
            item.id === selectedItem?.id
              ? {
                  detail: selectedDetail,
                  isLoading: isLoadingDetail,
                  error: selectedDetailError,
                }
              : { detail: undefined, isLoading: false };

          const detailMarkdown = getDetailMarkdown(
            item,
            renderState,
            preferences.useShortPrefix,
            inventoryRemoteError ?? selectedDetailRemoteError,
          );

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
                <ItemActions
                  item={item}
                  detail={renderState.detail}
                  useShortPrefix={preferences.useShortPrefix}
                  inventorySource={inventorySource}
                />
              }
            />
          );
        })
      )}
    </List>
  );
}

function getDetailMarkdown(
  item: InventoryItem,
  state: DetailRenderState,
  useShortPrefix: boolean,
  remoteError?: Error,
): string {
  if (state.isLoading) {
    return "Loading details...";
  }

  if (state.error) {
    return `Failed to load documentation.\n\n${state.error.message}`;
  }

  if (!state.detail) {
    return "Select an entry to load its documentation.";
  }

  const markdown = buildMarkdown(item, state.detail, useShortPrefix);

  if (remoteError) {
    return `${markdown}\n\n---\n\nUsing local docs because Raycast could not connect to the live Polars docs.\n\n${remoteError.message}`;
  }

  return markdown;
}

function RecoveryItem({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <List.Item
      id="local-docs-recovery"
      icon={Icon.ExclamationMark}
      title="Unable to Connect to Polars Docs"
      subtitle="Configure a downloaded docs folder to keep searching locally."
      detail={
        <List.Item.Detail
          markdown={`Raycast could not load the live Polars documentation inventory.\n\n${error.message}\n\nDownload the Polars docs repository, extract or clone it locally, then set **Local Docs Directory** in this command's preferences. The extension expects the selected folder to contain a \`stable\` directory or symlink with \`objects.inv\` and the HTML documentation tree.`}
        />
      }
      actions={
        <ActionPanel>
          <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action.OpenInBrowser title="Open Polars Docs Repository" url="https://github.com/pola-rs/polars" />
          <Action.OpenInBrowser title="Open Live Documentation" url="https://docs.pola.rs/api/python/stable/" />
        </ActionPanel>
      }
    />
  );
}

function ItemActions({
  item,
  detail,
  useShortPrefix,
  inventorySource,
}: {
  item: InventoryItem;
  detail?: DocDetail;
  useShortPrefix: boolean;
  inventorySource?: ResolvedDocumentationSource;
}) {
  const displayName = applyPrefixPreference(item.name, useShortPrefix);
  const signature = detail?.signature ? applyPrefixPreference(detail.signature, useShortPrefix) : undefined;

  return (
    <ActionPanel>
      <Action.Push
        title="View Full Documentation"
        icon={Icon.Document}
        target={
          <FullScreenDocumentation
            item={item}
            detail={detail}
            useShortPrefix={useShortPrefix}
            inventorySource={inventorySource}
          />
        }
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
  inventorySource,
}: {
  item: InventoryItem;
  detail?: DocDetail;
  useShortPrefix: boolean;
  inventorySource?: ResolvedDocumentationSource;
}) {
  const {
    data: loadedDetail,
    isLoading: isLoadingDetail,
    error: loadedDetailError,
    remoteError: loadedDetailRemoteError,
  } = useDocDetail(detail ? undefined : item, inventorySource);
  const effectiveDetail = detail ?? loadedDetail;
  const markdown = loadedDetailError
    ? `Failed to load documentation.\n\n${loadedDetailError.message}`
    : effectiveDetail
      ? getDetailMarkdown(item, { detail: effectiveDetail, isLoading: false }, useShortPrefix, loadedDetailRemoteError)
      : isLoadingDetail
        ? "Loading documentation..."
        : "Documentation details are unavailable.";
  const displayName = applyPrefixPreference(item.name, useShortPrefix);
  const displayShortName = applyPrefixPreference(item.shortName, useShortPrefix);
  const signature = effectiveDetail?.signature
    ? applyPrefixPreference(effectiveDetail.signature, useShortPrefix)
    : undefined;

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
