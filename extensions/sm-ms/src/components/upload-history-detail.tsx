import { List } from "@raycast/api";
import { ImageData } from "../types/types";
import { formatBytes } from "../utils/common-utils";

export function UploadHistoryDetail(props: { imageData: ImageData }) {
  const { imageData } = props;
  return (
    <List.Item.Detail
      markdown={`<img src="${imageData.url}" alt="${imageData.filename}" height="190"
 />`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Filename" text={imageData.filename} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(imageData.size)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Width ✕ Height" text={imageData.width + " ✕ " + imageData.height} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Upload Date" text={imageData.created_at} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Hash" text={imageData.hash} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
