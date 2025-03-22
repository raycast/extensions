import { Color, List } from "@raycast/api";

export const ListEmptyView = () => (
  <List.EmptyView
    icon={{ source: "mercado-libre-emptyview.png", tintColor: Color.SecondaryText }}
    title="What's on your shopping list?"
  />
);
