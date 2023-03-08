import { Color, Icon, List } from "@raycast/api";

export function NoLoginView() {
  return (
    <List>
      <List.EmptyView
        icon={{
          source: Icon.ExclamationMark,
          tintColor: Color.Red,
        }}
        title="Please use Login Bilibili command to login first."
      />
    </List>
  );
}
