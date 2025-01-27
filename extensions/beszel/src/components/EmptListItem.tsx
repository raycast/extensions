import { Color, List, type Image } from "@raycast/api";

export function EmptyListItem({ title, icon }: { title: string; icon: Image.Source }) {
  return (
    <List.Item
      title=""
      subtitle={title}
      icon={{
        source: icon,
        tintColor: Color.SecondaryText,
      }}
    />
  );
}
