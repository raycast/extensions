import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";

export const Error = (props: { title?: string; description?: string; icon?: Image.ImageLike }) => {
  const {
    title = "Error",
    description = "Encountered some problems, please try again.",
    icon = Icon.XMarkCircleFilled,
  } = props;
  return (
    <List
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={"Go to Website"} url="https://www.chatgo.pro/subscription" />
        </ActionPanel>
      }
    >
      <List.EmptyView title={title} description={description} icon={icon} />
    </List>
  );
};
