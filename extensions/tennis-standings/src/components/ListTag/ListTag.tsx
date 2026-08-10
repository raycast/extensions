import { Color, List } from "@raycast/api";
import { FC } from "react";

type ListTagProps = {
  text: string;
  color?: Color.ColorLike | null | undefined;
  title: string;
};

export const ListTag: FC<ListTagProps> = ({ text, color, title }) => {
  return (
    <List.Item.Detail.Metadata.TagList title={title}>
      <List.Item.Detail.Metadata.TagList.Item text={text} color={color} />
    </List.Item.Detail.Metadata.TagList>
  );
};
