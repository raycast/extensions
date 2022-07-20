import { Icon, List } from "@raycast/api";

export default function EmptyListView(props?: { title?: string; description?: string }): JSX.Element {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={props?.title ?? "Sorry"}
      description={props?.description ?? "did not find any external sound devices"}
    />
  );
}
