import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from "@raycast/api";
import { SearchResult } from "../types";

export default function SearchResultItem(props: { result: SearchResult }) {
  const result = props.result;
  let title,
    subtitle,
    accessoryTitle = undefined;
  let hierarchy = Object.values(result.hierarchy);

  hierarchy = hierarchy
    .filter((value) => value !== null)
    .slice(-3)
    .reverse();

  Object.entries(hierarchy).forEach(function ([key, value]) {
    switch (key) {
      case "2":
        accessoryTitle = value;
        break;
      case "1":
        subtitle = value;
        break;
      default:
        title = value;
    }
  });

  return (
    <List.Item
      title={title ? title : ""}
      subtitle={subtitle}
      accessoryTitle={accessoryTitle}
      icon="command-icon.png"
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={result.url} />
          <CopyToClipboardAction title="Copy URL" content={result.url} />
        </ActionPanel>
      }
    />
  );
}
