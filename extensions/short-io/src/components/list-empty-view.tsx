import { ActionPanel, Image, List } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";
import ImageLike = Image.ImageLike;
import { ActionGoShortIo } from "./action-go-short-io";

export function ListEmptyView(props: { title: string; icon: ImageLike }) {
  const { title, icon } = props;
  return (
    <List.EmptyView
      title={title}
      icon={icon}
      actions={
        <ActionPanel>
          <ActionGoShortIo />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
