import { Icon, List } from "@raycast/api";

type ListItemAsTagsOrIconProps = {
  title: string;
  items: string[];
};

/**
 * Returns <List.Item.Detail.Metadata.TagList> with childen if present and <List.Item.Detail.Metadata.Label icon={Icon.Minus} /> if not.
 */
export default function ListItemAsTagsOrIcon({ title, items }: ListItemAsTagsOrIconProps) {
  return items.length ? (
    <List.Item.Detail.Metadata.TagList title={title}>
      {items.map((item) => (
        <List.Item.Detail.Metadata.TagList.Item key={item} text={item} />
      ))}
    </List.Item.Detail.Metadata.TagList>
  ) : (
    <List.Item.Detail.Metadata.Label title={title} icon={Icon.Minus} />
  );
}
