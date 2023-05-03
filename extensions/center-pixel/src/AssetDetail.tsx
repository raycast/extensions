import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import AssetTransferHistory from "./AssetTransferHistory";
import { ApiUrls } from "./constants/center";
import { getRandomColor } from "./utils/color";
import { markdownNFTDetail } from "./utils/markdown";
import { AssetDetailsResponse } from "./types";

type AssetDetailProps = {
  address: string;
  tokenId: string;
};

// 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D
export default function AssetDetail({ address, tokenId }: AssetDetailProps) {
  const { data } = useFetch<AssetDetailsResponse>(ApiUrls.getAsset(address, tokenId), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": "keya5c220403e6b7ac702391824" },
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
              onAction={() => push(<AssetTransferHistory address={data.address} tokenId={data.tokenId} />)}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
