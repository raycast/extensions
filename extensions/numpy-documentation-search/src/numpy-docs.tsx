import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, openCommandPreferences } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useDocDetail } from "./hooks/useDocDetail";
import { useInventory } from "./hooks/useInventory";
import { type DocDetail, buildMarkdown } from "./lib/doc-detail";
// `DocumentationSourceMode` is not needed here; preferences are typed via
// the generated `Preferences` in `raycast-env.d.ts`.
import { type InventoryItem } from "./lib/inventory";
import { applyPrefixPreference } from "./lib/prefix";
import { searchInventory } from "./lib/search";

// `Preferences` is generated at runtime in `raycast-env.d.ts` from `package.json`.
// Do not manually declare it here to avoid drift with the manifest.

type DetailRenderState = {
  detail?: DocDetail;
  isLoading: boolean;
  error?: Error;
};

const RECOVERY_ITEM_ID = "__recovery__";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const preferences = getPreferenceValues<Preferences>();
  const documentationSourceMode = preferences.documentationSourceMode ?? "online";

  const {
    data: inventory = [],
    isLoading: isLoadingInventory,
    error: inventoryError,
    remoteError,
    revalidate: revalidateInventory,
    source: inventorySource,
  } = useInventory({
    localDocsDirectory: preferences.localDocsDirectory,
    mode: documentationSourceMode,
  });

  const results = useMemo(() => searchInventory(inventory, searchText), [inventory, searchText]);
  const showRecoveryItem = Boolean(remoteError) && searchText.trim().length === 0;

  useEffect(() => {
    if (showRecoveryItem) {
      setSelectedId((current) => {
        if (current && (current === RECOVERY_ITEM_ID || results.some((item) => item.id === current))) {
          return current;
        }

        return RECOVERY_ITEM_ID;
      });
      return;
    }

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
  }, [results, showRecoveryItem]);

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
      searchBarPlaceholder="Search NumPy documentation..."
      onSearchTextChange={setSearchText}
      throttle
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      {inventoryError ? (
        <List.Item
          id={RECOVERY_ITEM_ID}
          title="Unable to load NumPy documentation"
          subtitle="Open preferences to configure a local docs directory"
          icon={Icon.ExclamationMark}
          detail={
            <List.Item.Detail
              markdown={buildRecoveryMarkdown(inventoryError, Boolean(preferences.localDocsDirectory))}
            />
          }
          actions={<RecoveryActions revalidate={revalidateInventory} />}
        />
      ) : noResults ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No results" description="Try a different NumPy symbol." />
      ) : (
        <>
          {showRecoveryItem && remoteError ? (
            <List.Item
              id={RECOVERY_ITEM_ID}
              title="Using local NumPy docs"
              subtitle="Live access to numpy.org failed"
              icon={Icon.Info}
              detail={
                <List.Item.Detail
                  markdown={buildRecoveryMarkdown(remoteError, Boolean(preferences.localDocsDirectory))}
                />
              }
              actions={<RecoveryActions revalidate={revalidateInventory} />}
            />
          ) : null}
          {results.map((item) => {
            const renderState: DetailRenderState =
              item.id === selectedItem?.id
                ? {
                    detail: selectedDetail,
                    error: selectedDetailError,
                    isLoading: isLoadingDetail,
                  }
                : { detail: undefined, isLoading: false };

            return (
              <List.Item
                key={item.id}
                id={item.id}
                title={applyPrefixPreference(item.shortName, preferences.useShortPrefix)}
                subtitle={applyPrefixPreference(item.name, preferences.useShortPrefix)}
                accessories={[{ text: item.role.replace("py:", "") }]}
                icon={Icon.Book}
                detail={
                  <List.Item.Detail markdown={getDetailMarkdown(item, renderState, preferences.useShortPrefix)} />
                }
                actions={
                  <ItemActions item={item} detail={renderState.detail} useShortPrefix={preferences.useShortPrefix} />
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

function RecoveryActions({ revalidate }: { revalidate: () => void }) {
  return (
    <ActionPanel>
      <Action title="Open Command Preferences" onAction={openCommandPreferences} />
      <Action title="Retry Live Download" icon={Icon.ArrowClockwise} onAction={revalidate} />
      <Action.OpenInBrowser title="Open NumPy Docs Repository" url="https://github.com/numpy/doc" />
    </ActionPanel>
  );
}

function buildRecoveryMarkdown(error: Error, hasLocalDocsDirectory: boolean): string {
  return [
    "# Unable to reach live NumPy docs",
    "",
    "This extension was not able to connect to `https://numpy.org/doc/stable/`.",
    "",
    "If you can access the internet outside of Raycast, you can download the generated NumPy docs elsewhere and point the extension at that folder.",
    "",
    "## Setup",
    "",
    "1. Download the ZIP for the generated NumPy docs from [numpy/doc](https://github.com/numpy/doc) or get it from another machine that can access `numpy.org`.",
    "2. Extract the ZIP locally. The extension will look for the documentation version under the `stable` folder inside what you downloaded.",
    hasLocalDocsDirectory
      ? "3. Open this command's preferences and verify that **Local Docs Directory** points to the downloaded docs folder."
      : "3. Open this command's preferences and set **Local Docs Directory** to the downloaded docs folder.",
    "",
    "## Current error",
    "",
    `\`${error.message}\``,
  ].join("\n");
}
