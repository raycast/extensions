import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { REACT_DOCS } from "./data/index";

export default function Command() {
  return (
    <List>
      {REACT_DOCS.map(({ id, title, type, url }) => (
        <List.Item
          key={id}
          title={title}
          icon={"icon.png"}
          accessories={[{ text: `${type}`, icon: type === "hooks" ? Icon.Anchor : Icon.Book }]}
          actions={
            <ActionPanel title={title}>
              <Action.OpenInBrowser url={url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
