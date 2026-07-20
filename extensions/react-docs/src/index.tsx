import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { REACT_DOCS } from "./data/index";

function getIconForType(type: string): Icon {
  switch (type) {
    case "hooks":
      return Icon.Anchor;
    case "components":
      return Icon.Box;
    case "APIs":
      return Icon.Code;
    case "legacy":
      return Icon.Clock;
    case "DOM components":
      return Icon.Window;
    case "DOM APIs":
      return Icon.Terminal;
    case "resource preloading":
      return Icon.Download;
    case "server APIs":
      return Icon.Cloud;
    default:
      return Icon.Book;
  }
}

export default function Command() {
  return (
    <List>
      {REACT_DOCS.map(({ id, title, type, url }) => (
        <List.Item
          key={id}
          title={title}
          icon={"icon.png"}
          accessories={[{ text: `${type}`, icon: getIconForType(type) }]}
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
