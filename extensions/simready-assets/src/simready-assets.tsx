import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { AssetActions, CatalogActions } from "./components/asset-actions";
import { AssetFiles } from "./components/asset-files";
import { useAssetDetails } from "./hooks/use-asset-details";
import { contentUrl, formatBytes, searchAssets } from "./lib/assets";
import type { Asset, AssetDetails } from "./lib/assets";
import { getCatalog } from "./lib/hugging-face";

const PAGE_SIZE = 80;

function AssetPreview({
  asset,
  details,
  isLoading,
  error,
  showMetadata,
}: {
  asset: Asset;
  details?: AssetDetails;
  isLoading: boolean;
  error?: Error;
  showMetadata: boolean;
}) {
  const markdown = details
    ? details.preview
      ? `![Asset preview](${contentUrl(details.preview.path)}?raycast-height=240)`
      : "*No preview image available.*"
    : error
      ? `**Preview unavailable**\n\n${error.message}\n\nYou can still open this asset on Hugging Face.`
      : "Loading preview and file information…";

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        showMetadata ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Asset" text={asset.id} />
            <List.Item.Detail.Metadata.Label title="Type" text={asset.category} />
            {details && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Folder Size" text={formatBytes(details.totalSize)} />
                <List.Item.Detail.Metadata.Label title="Files" text={String(details.files.length)} />
                {details.models.length > 0 && (
                  <List.Item.Detail.Metadata.Label
                    title="Model Format"
                    text={[...new Set(details.models.map((model) => model.path.split(".").pop()?.toUpperCase()))].join(
                      ", ",
                    )}
                  />
                )}
                {details.license && <List.Item.Detail.Metadata.Label title="License" text={details.license} />}
              </>
            )}
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  );
}

export default function Command() {
  const abortable = useRef<AbortController | null>(null);
  const {
    data: assets = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(() => getCatalog(abortable.current?.signal), [], {
    abortable,
    failureToastOptions: { title: "Could Not Load Asset Catalog" },
  });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showMetadata, setShowMetadata] = useState(false);
  const filtered = useMemo(() => searchAssets(assets, query, category), [assets, query, category]);
  const visible = filtered.slice(0, visibleCount);
  const selected = visible.find((asset) => asset.id === selectedId) ?? visible[0];
  const {
    data: assetData,
    isLoading: isLoadingDetails,
    error: detailError,
    revalidate: refreshDetails,
  } = useAssetDetails(selected?.id ?? "");
  const details = assetData?.id === selected?.id ? assetData : undefined;
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const asset of assets) counts.set(asset.category, (counts.get(asset.category) ?? 0) + 1);
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
  }, [assets]);
  const catalogActions = (
    <ActionPanel>
      <CatalogActions refresh={revalidate} />
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading || isLoadingDetails}
      isShowingDetail={Boolean(selected)}
      navigationTitle="SimReady Assets"
      searchBarPlaceholder="Search assets by name, type, or variant…"
      filtering={false}
      searchText={query}
      onSearchTextChange={(value) => {
        setQuery(value);
        setVisibleCount(PAGE_SIZE);
      }}
      onSelectionChange={setSelectedId}
      selectedItemId={selected?.id}
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: filtered.length > visibleCount,
        onLoadMore: () => setVisibleCount((count) => count + PAGE_SIZE),
      }}
      actions={catalogActions}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Asset Type"
          value={category}
          onChange={(value) => {
            setCategory(value);
            setVisibleCount(PAGE_SIZE);
          }}
        >
          <List.Dropdown.Item title="All Types" value="" />
          <List.Dropdown.Section title="Asset Types">
            {categories.map(([name, count]) => (
              <List.Dropdown.Item key={name} title={`${name} (${count})`} value={name} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
        title={isLoading ? "Loading Asset Catalog…" : error ? "Could Not Load Assets" : "No Assets Found"}
        description={error ? error.message : "Try another search or choose All Types."}
        actions={catalogActions}
      />
      <List.Section
        title={category || "All Assets"}
        subtitle={`${filtered.length.toLocaleString()}${query || category ? ` of ${assets.length.toLocaleString()}` : ""} assets${error ? " · Cached catalog" : ""}`}
      >
        {visible.map((asset) => (
          <List.Item
            key={asset.id}
            id={asset.id}
            title={asset.title}
            icon={Icon.Box}
            detail={
              asset.id === selected?.id ? (
                <AssetPreview
                  asset={asset}
                  details={details}
                  isLoading={isLoadingDetails}
                  error={detailError}
                  showMetadata={showMetadata}
                />
              ) : undefined
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push title="Browse Asset Files" icon={Icon.List} target={<AssetFiles asset={asset} />} />
                  <AssetActions asset={asset} details={asset.id === selected?.id ? details : undefined} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title={showMetadata ? "Hide Metadata" : "Show Metadata"}
                    icon={Icon.Info}
                    onAction={() => setShowMetadata((visible) => !visible)}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "i" },
                      Windows: { modifiers: ["ctrl"], key: "i" },
                    }}
                  />
                  <Action
                    title="Refresh Asset Details"
                    icon={Icon.ArrowClockwise}
                    onAction={refreshDetails}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "r" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "r" },
                    }}
                  />
                </ActionPanel.Section>
                <CatalogActions refresh={revalidate} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
