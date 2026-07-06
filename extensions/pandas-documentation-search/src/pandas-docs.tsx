import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useInventory } from "./hooks/useInventory";
import { useDocDetail } from "./hooks/useDocDetail";
import { type InventoryItem } from "./lib/inventory";
import { buildMarkdown, type DocDetail } from "./lib/doc-detail";
import { searchInventory } from "./lib/search";
import { applyPrefixPreference } from "./lib/prefix";
import type { DocumentationSourceMode, ResolvedDocumentationSource } from "./lib/docs-source";

const PANDAS_REPOSITORY_URL = "https://github.com/pandas-dev/pandas";

type DetailRenderState = {
  detail?: DocDetail;
  isLoading: boolean;
  error?: Error;
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const preferences = getPreferenceValues<Preferences>();
  const documentationSourceMode = preferences.documentationSourceMode ?? "online";

  const {
    data: inventory = [],
    source: inventorySource,
    remoteError: inventoryRemoteError,
    isLoading: isLoadingInventory,
    error: inventoryError,
    revalidate: revalidateInventory,
  } = useInventory({
    localDocsDirectory: preferences.localDocsDirectory,
    mode: documentationSourceMode,
  });
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
  } = useDocDetail({
    inventorySource,
    item: selectedItem,
    localDocsDirectory: preferences.localDocsDirectory,
    mode: documentationSourceMode,
  });

  const listIsLoading = isLoadingInventory;
  const noResults = !listIsLoading && results.length === 0;

  return (
    <List
      isLoading={listIsLoading}
      isShowingDetail
      searchBarPlaceholder="Search Pandas documentation..."
      onSearchTextChange={setSearchText}
      throttle
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      {inventoryError ? (
        <RecoveryItem error={inventoryError} mode={documentationSourceMode} revalidate={revalidateInventory} />
      ) : noResults ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No results" description="Try a different Pandas symbol." />
      ) : (
        <>
          {inventoryRemoteError ? (
            <RecoveryItem
              error={inventoryRemoteError}
              mode={documentationSourceMode}
              revalidate={revalidateInventory}
              source={inventorySource}
            />
          ) : null}
          {results.map((item) => {
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
                  <ItemActions
                    item={item}
                    detail={renderState.detail}
                    inventorySource={inventorySource}
                    localDocsDirectory={preferences.localDocsDirectory}
                    mode={documentationSourceMode}
                    useShortPrefix={preferences.useShortPrefix}
                  />
                }
              />
            );
          })}
        </>
      )}
    </List>
  );
}

function getDetailMarkdown(item: InventoryItem, state: DetailRenderState, useShortPrefix: boolean): string {
  if (state.isLoading) {
    return "Loading details...";
  }

  if (state.error) {
    return `Failed to load documentation.\n\n${state.error.message}`;
  }

  if (!state.detail) {
    return "Select an entry to load its documentation.";
  }

  return buildMarkdown(item, state.detail, useShortPrefix);
}

function ItemActions({
  item,
  detail,
  inventorySource,
  localDocsDirectory,
  mode,
  useShortPrefix,
}: {
  item: InventoryItem;
  detail?: DocDetail;
  inventorySource?: ResolvedDocumentationSource;
  localDocsDirectory?: string;
  mode: DocumentationSourceMode;
  useShortPrefix: boolean;
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
            inventorySource={inventorySource}
            localDocsDirectory={localDocsDirectory}
            mode={mode}
            useShortPrefix={useShortPrefix}
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

function RecoveryItem({
  error,
  mode,
  revalidate,
  source,
}: {
  error: Error;
  mode: DocumentationSourceMode;
  revalidate: () => void;
  source?: ResolvedDocumentationSource;
}) {
  const isLocalFailure = mode === "local" && source !== "local";
  const title =
    source === "local"
      ? "Using Local Pandas Documentation"
      : isLocalFailure
        ? "Unable to Load Local Pandas Documentation"
        : "Configure Local Pandas Documentation";
  const subtitle = isLocalFailure
    ? "Check the configured local docs folder"
    : "Open preferences to select a downloaded docs folder";
  const markdown = [
    isLocalFailure
      ? "Raycast could not load Pandas documentation from the configured local docs folder."
      : "Raycast could not connect to the online Pandas documentation.",
    "",
    source === "local"
      ? "The extension recovered by using the configured local docs folder."
      : isLocalFailure
        ? "Make sure **Local Docs Directory** points to the extracted Pandas docs folder and contains a `stable` subfolder with `objects.inv`."
        : "To keep searching while offline or when the site is unreachable, configure a local docs folder.",
    "",
    "1. Download the Pandas documentation source ZIP.",
    "2. Extract it locally.",
    "3. Set **Local Docs Directory** to the extracted folder.",
    "4. The extension will read documentation from its `stable` subfolder.",
    "",
    `Error: ${error.message}`,
  ].join("\n");

  return (
    <List.Item
      id="local-docs-recovery"
      title={title}
      subtitle={subtitle}
      icon={Icon.ExclamationMark}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action title="Retry Online Documentation" icon={Icon.RotateClockwise} onAction={revalidate} />
          <Action.OpenInBrowser title="Open Pandas Repository" url={PANDAS_REPOSITORY_URL} />
        </ActionPanel>
      }
    />
  );
}

function FullScreenDocumentation({
  item,
  detail,
  inventorySource,
  localDocsDirectory,
  mode,
  useShortPrefix,
}: {
  item: InventoryItem;
  detail?: DocDetail;
  inventorySource?: ResolvedDocumentationSource;
  localDocsDirectory?: string;
  mode: DocumentationSourceMode;
  useShortPrefix: boolean;
}) {
  const {
    data: loadedDetail,
    isLoading: isLoadingDetail,
    error: loadedDetailError,
  } = useDocDetail({
    inventorySource,
    item: detail ? undefined : item,
    localDocsDirectory,
    mode,
  });
  const effectiveDetail = detail ?? loadedDetail;
  const markdown = loadedDetailError
    ? `Failed to load documentation.\n\n${loadedDetailError.message}`
    : effectiveDetail
      ? buildMarkdown(item, effectiveDetail, useShortPrefix)
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
