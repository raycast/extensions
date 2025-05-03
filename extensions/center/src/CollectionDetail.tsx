import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { getErrorColor, getSuccessColor } from "./utils/color";
import { markdownCollectionDetail } from "./utils/markdown";
import { getCollectionCenterUrl } from "./utils/url";
import { useCollectionDetails, useFloorPrice, useVolumeData } from "./hooks/center";

type CollectionDetailProps = {
  address: string;
};

// 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D
export default function CollectionDetail({ address }: CollectionDetailProps) {
  const { data } = useCollectionDetails({ address });
  const { data: floorPriceData } = useFloorPrice({ address });
  const { data: volumeData } = useVolumeData({ address });

  return (
    <Detail
      actions={
        <ActionPanel>
          {data ? (
            <Action.OpenInBrowser
              title="See on Center.app"
              icon={Icon.Globe}
              url={getCollectionCenterUrl("ethereum-mainnet", data.address)}
            />
          ) : null}
        </ActionPanel>
      }
      markdown={markdownCollectionDetail(data?.smallPreviewImageUrl, data?.name, floorPriceData, volumeData)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={data?.name || "-"} />
          <Detail.Metadata.TagList title="Number of Assets">
            {data ? <Detail.Metadata.TagList.Item text={data.numAssets?.toString() || "-"} /> : null}
          </Detail.Metadata.TagList>
          {data ? (
            <Detail.Metadata.TagList title="Is Spam">
              <Detail.Metadata.TagList.Item
                text={data.isSpam ? "Yes" : "No"}
                color={data.isSpam ? getErrorColor() : getSuccessColor()}
              />
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Contract Address" text={data?.address || "-"} />
          <Detail.Metadata.Label title="Creator" text={data?.creator || "-"} />
          <Detail.Metadata.Label title="Owner" text={data?.owner || "-"} />
          <Detail.Metadata.Label title="Collection" text={data?.name || "-"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="URL" target={`https://center.app/collections/${data?.address}`} text="Center" />
        </Detail.Metadata>
      }
    />
  );
}
