import { Grid } from "@raycast/api";
import { Video } from "pexels";
import { ActionOnVideos } from "./action-on-videos";

export function VideosGridItem(props: { item: Video; index: number }) {
  const { item, index } = props;

  return (
    <Grid.Item
      id={index + "_" + item.id}
      key={index + "_" + item.id}
      content={item.image}
      title={item.user.name}
      actions={<ActionOnVideos item={item} />}
    />
  );
}
