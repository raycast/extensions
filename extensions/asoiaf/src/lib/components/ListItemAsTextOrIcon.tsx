import { Icon, List } from "@raycast/api";

type ListItemAsTextOrIconProps = {
  title: string;
  text: string;
};

/**
 * Returns <List.Item.Detail.Metadata.Label> with text if present and with Icon.Minus if not.
 */
export default function ListItemAsTextOrIcon({ title, text }: ListItemAsTextOrIconProps) {
  return <List.Item.Detail.Metadata.Label title={title} text={text || ""} icon={text ? undefined : Icon.Minus} />;
}
