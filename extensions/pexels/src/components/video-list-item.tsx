import { List } from "@raycast/api";
import { Video } from "pexels";
import { ActionOnVideos } from "./action-on-videos";

export function VideosListItem(props: { item: Video; index: number }) {
  const { item, index } = props;

  return (
    <List.Item
      id={index + "_" + item.id}
      key={index + "_" + item.id}
      icon={{ source: item.image }}
      title={item.user.name}
      accessories={[{ text: `${item.duration}s` }]}
      detail={
        <List.Item.Detail
          isLoading={false}
          markdown={`![${item.url}](${item.image})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link title="User" target={`${item.user.url}`} text={`${item.user.name}`} />
              <List.Item.Detail.Metadata.Label title="Size" text={`${item.width}x${item.height}`} />
              <List.Item.Detail.Metadata.Label title="Duration" text={`${item.duration}s`} />
              <List.Item.Detail.Metadata.Link title="URL" target={`${item.url}`} text={`${item.url}`} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<ActionOnVideos item={item} />}
    />
  );
}
