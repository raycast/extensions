import { List, ActionPanel, Action } from "@raycast/api";
import { Icons } from "../utils/utils";

export const HomePage = (props: { url: string; description: string }) => {
  return (
    <List.EmptyView
      title="Open Home Page in Browser"
      description={props.description}
      icon={{ source: Icons["HomePage"] }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={props.url} />
        </ActionPanel>
      }
    />
  );
};
