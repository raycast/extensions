import { List, ActionPanel, Action, showToast, Toast, Icon, Color, Image } from "@raycast/api";
import { AssetEntity } from "../api";
import { useAssetsQuery, getAssetsErrorMessage, getFlatAssetsList } from "../hooks/useAssets";
import { formatDate, formatAddress, formatNumber } from "../utils";
import { getAssetStatusIcon, getAssetStatusText, isAssetMinted } from "../utils/assetStatus";

type ItemAccessory = (
  | {
      text?:
        | string
        | undefined
        | null
        | {
            value: string | undefined | null;
            color?: Color;
          };
    }
  | {
      date?:
        | Date
        | undefined
        | null
        | {
            value: Date | undefined | null;
            color?: Color;
          };
    }
  | {
      tag:
        | string
        | Date
        | undefined
        | null
        | {
            value: string | Date | undefined | null;
            color?: Color.ColorLike;
          };
    }
) & {
  icon?: Image.ImageLike | undefined | null;
  tooltip?: string | undefined | null;
};

interface AssetsListProps {
  contractId?: string;
  searchBarPlaceholder?: string;
}

export function AssetsList({ contractId, searchBarPlaceholder = "Search assets..." }: AssetsListProps) {
  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useAssetsQuery({
    contractId,
  });

  const handleRetry = async () => {
    await refetch();
  };

  const handleLoadMore = async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  };

  if (error) {
    const errorMessage = getAssetsErrorMessage(error);
    showToast({
      style: Toast.Style.Failure,
      title: "Error Loading Assets",
      message: errorMessage,
    });
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Assets"
          description={getAssetsErrorMessage(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={handleRetry} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const assets = getFlatAssetsList(data?.pages);

  const renderAsset = (asset: AssetEntity) => {
    const accessories: ItemAccessory[] = [];

    // Добавляем статус только если NFT не сминчен
    if (!isAssetMinted(asset.status)) {
      accessories.push({ text: getAssetStatusText(asset.status) });
    }

    // Для ERC1155 показываем editions
    if (asset.ercContractType === "ERC1155") {
      accessories.push({
        text: `${formatNumber(asset.currentEditions)}/${formatNumber(asset.editions)}`,
        tooltip: "Current/Total Editions",
      });
    }

    // Добавляем специальные иконки
    if (asset.isListed) {
      accessories.push({
        icon: { source: "pixelart-source/solid-eye.svg", tintColor: Color.Blue },
        tooltip: "Listed for sale",
      });
    }

    if (asset.isEncrypted) {
      accessories.push({
        icon: { source: "pixelart-source/solid-lock.svg", tintColor: "hsl(338, 94%, 35%)" },
        tooltip: "Encrypted",
      });
    }

    if (asset.isHasSecret) {
      accessories.push({
        icon: { source: "pixelart-source/solid-lock.svg", tintColor: Color.Green },
        tooltip: "Has secret",
      });
    }

    if (asset.inTransfer) {
      accessories.push({
        icon: { source: "pixelart-source/solid-sync.svg", tintColor: Color.Yellow },
        tooltip: "In transfer",
      });
    }

    const uri = asset.isEncrypted ? asset.thumbnailBigUrl : (asset.thumbnailBigUrl ?? asset.sourceUrl);

    return (
      <List.Item
        key={asset.id}
        icon={asset.thumbnailUrl ? { source: asset.thumbnailUrl } : getAssetStatusIcon(asset.status)}
        title={asset.title}
        subtitle={!contractId ? asset.collectionName : undefined}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Asset ID"
                content={asset.id}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              {asset.contractAddress && (
                <Action.CopyToClipboard
                  title="Copy Contract Address"
                  content={asset.contractAddress}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
              )}
              {asset.tokenId && (
                <Action.CopyToClipboard
                  title="Copy Token ID"
                  content={asset.tokenId}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              )}
              {asset.openSeaUrl && (
                <Action.OpenInBrowser
                  title="View on Opensea"
                  url={asset.openSeaUrl}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Refresh"
                onAction={handleRetry}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={uri ? `![Illustration](${uri})` : undefined}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Asset Information" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Title" text={asset.title} />
                <List.Item.Detail.Metadata.Label title="Collection" text={asset.collectionName} />
                <List.Item.Detail.Metadata.Label title="Status" text={getAssetStatusText(asset.status)} />
                <List.Item.Detail.Metadata.Label title="Media Type" text={asset.mediaType} />
                {asset.description && <List.Item.Detail.Metadata.Label title="Description" text={asset.description} />}
                <List.Item.Detail.Metadata.Separator />
                {asset.ercContractType === "ERC1155" && (
                  <List.Item.Detail.Metadata.Label
                    title="Editions"
                    text={`${formatNumber(asset.currentEditions)} / ${formatNumber(asset.editions)}`}
                  />
                )}
                <List.Item.Detail.Metadata.Label title="ERC Type" text={asset.ercContractType} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Asset ID" text={asset.id} />
                <List.Item.Detail.Metadata.Label title="Contract ID" text={asset.contractId} />
                {asset.tokenId && <List.Item.Detail.Metadata.Label title="Token ID" text={asset.tokenId} />}
                {asset.contractAddress && (
                  <List.Item.Detail.Metadata.Label
                    title="Contract Address"
                    text={formatAddress(asset.contractAddress)}
                  />
                )}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Creator" text={asset.creatorName} />
                <List.Item.Detail.Metadata.Label title="Creator Address" text={formatAddress(asset.creatorAddress)} />
                <List.Item.Detail.Metadata.Label title="Current Owner" text={asset.currentOwnerName || "Unknown"} />
                <List.Item.Detail.Metadata.Label
                  title="Owner Address"
                  text={formatAddress(asset.currentOwnerAddress)}
                />
                <List.Item.Detail.Metadata.Separator />
                {asset.createdAt && (
                  <List.Item.Detail.Metadata.Label title="Created" text={formatDate(asset.createdAt)} />
                )}
                {asset.mintedAt && <List.Item.Detail.Metadata.Label title="Minted" text={formatDate(asset.mintedAt)} />}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={searchBarPlaceholder}
      pagination={{
        onLoadMore: handleLoadMore,
        hasMore: hasNextPage || false,
        pageSize: 20,
      }}
      isShowingDetail
    >
      {assets.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Image}
          title={contractId ? "No Assets in Collection" : "No Assets Found"}
          description={
            contractId
              ? "This collection doesn't contain any assets yet."
              : "You haven't created any assets yet. Create your first asset to get started."
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={handleRetry} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        assets.map(renderAsset)
      )}
    </List>
  );
}
