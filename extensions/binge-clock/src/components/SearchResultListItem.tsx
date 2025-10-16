import { List, Color, ActionPanel, Action, Icon, Clipboard } from "@raycast/api";
import { SearchResult } from "../interface/search-result";
import { watchTimeHUD } from "./WatchTimeHud";

export function SearchResultListItem(props: { result: SearchResult }) {
  const { result } = props;
  const { title, url, image, type } = result;

  return (
    <List.Item
      id={url}
      title={title}
      icon={{ source: image }}
      accessories={[{ tag: { value: type, color: type === "show" ? Color.Green : Color.Blue } }]}
      actions={
        <ActionPanel>
          <Action title="Calculate Watch Time" icon={{ source: Icon.Clock }} onAction={() => watchTimeHUD({ url })} />
          <Action.OpenInBrowser title="Open in Browser" icon={{ source: Icon.Globe }} url={url} />
          <Action.CopyToClipboard
            title="Copy URL"
            icon={{ source: Icon.Clipboard }}
            content={url}
            shortcut={{
              modifiers: ["cmd"],
              key: "c",
            }}
          />
        </ActionPanel>
      }
    />
  );
}
