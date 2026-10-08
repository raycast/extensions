import { useState } from "react";
import { Color, List, open } from "@raycast/api";

export default function Tags({
  title,
  tags,
  color,
  link,
}: {
  readonly title: string;
  readonly tags?: string[];
  readonly color?: Color;
  link?: (tag: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!tags || tags.length === 0) return null;

  return (
    <List.Item.Detail.Metadata.TagList title={title}>
      {tags.slice(0, expanded ? tags.length : 5).map((tag) => (
        <List.Item.Detail.Metadata.TagList.Item
          key={tag}
          color={color}
          text={tag}
          onAction={link ? () => open(link(tag)) : undefined}
        />
      ))}
      {tags.length > 5 && (
        <List.Item.Detail.Metadata.TagList.Item
          color={Color.SecondaryText}
          text={expanded ? "Show less" : "Show more"}
          onAction={() => {
            setExpanded(!expanded);
          }}
        />
      )}
    </List.Item.Detail.Metadata.TagList>
  );
}
