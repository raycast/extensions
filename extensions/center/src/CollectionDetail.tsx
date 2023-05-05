import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ApiUrls, CENTER_API_KEY } from "./constants/center";
import type { CollectionResponse, FloorPriceResponse, VolumeResponse } from "./types";
import { getErrorColor, getSuccessColor } from "./utils/color";
import { markdownCollectionDetail } from "./utils/markdown";

type CollectionDetailProps = {
  address: string;
};

// 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D
export default function CollectionDetail({ address }: CollectionDetailProps) {
  const { data } = useFetch<CollectionResponse>(ApiUrls.getCollection("ethereum-mainnet", address), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": CENTER_API_KEY },
  });

  const { data: floorPriceData } = useFetch<FloorPriceResponse>(
    ApiUrls.getFloorPriceOfCollection("ethereum-mainnet", address),
    {
      method: "GET",
      headers: { accept: "application/json", "X-API-Key": CENTER_API_KEY },
    }
  );

  const { data: volumeData } = useFetch<VolumeResponse>(ApiUrls.getVolumeOfCollection("ethereum-mainnet", address), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": CENTER_API_KEY },
  });

  return (
    <Detail
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
