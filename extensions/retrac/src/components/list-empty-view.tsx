import { ActionPanel, Image, List } from "@raycast/api";
import { ActionGoRetrac } from "./action-go-retrac";
import ImageLike = Image.ImageLike;

export function ListEmptyView(props: { title: string; icon: ImageLike }) {
  const { title, icon } = props;
  return (
    <List.EmptyView
      title={title}
      icon={icon}
      actions={
        <ActionPanel>
          <ActionGoRetrac />
        </ActionPanel>
      }
    />
  );
}