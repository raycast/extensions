import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import AssetTransferHistory from "./AssetTransferHistory";
import { getRandomColor } from "./utils/color";
import { markdownNFTDetail } from "./utils/markdown";
import { getAssetCenterUrl } from "./utils/url";
import { useAssetDetails } from "./hooks/center";

type AssetDetailProps = {
  address: string;
  tokenId: string;
};

// 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D
export default function AssetDetail({ address, tokenId }: AssetDetailProps) {
  const { data } = useAssetDetails({
    address,
    tokenId,
  });
  const { push } = useNavigation();

  if (!data) return null;

  return (
    <Detail
      markdown={markdownNFTDetail(data?.smallPreviewImageUrl, data?.name)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Contract Address" text={data?.address} />
          <Detail.Metadata.Label title="Collection" text={data.collectionName} />
          <Detail.Metadata.Label title="Token ID" text={data?.tokenId} />
          <Detail.Metadata.TagList title="Attributes">
            {data?.metadata?.attributes?.map((attribute: { trait_type: string; value: string }) => (
              <Detail.Metadata.TagList.Item
                key={`${attribute.trait_type}: ${attribute.value}`}
                text={`${attribute.trait_type}: ${attribute.value}`}
                color={getRandomColor()}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="URL"
            target={`https://center.app/collections/${data?.address}/${data?.tokenId}`}
            text={"Center"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {data ? (
            <Action
              title="Transfer History"
              icon={Icon.List}
              onAction={() =>
                push(
                  <AssetTransferHistory
                    title={`${data.collectionName} / ${data.name} - Transfer History`}
                    address={data.address}
                    tokenId={data.tokenId}
                  />
                )
              }
            />
          ) : null}
          <Action.OpenInBrowser
            title="See on Center.app"
            icon={Icon.Globe}
            url={getAssetCenterUrl("ethereum-mainnet", data.address, data?.tokenId)}
          />
        </ActionPanel>
      }
    />
  );
}
