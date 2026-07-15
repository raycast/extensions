import { ActionPanel, Action, List } from "@raycast/api";
import { ColorName } from "@catppuccin/palette";

import { getDefaultIcon, getIcon } from "./utils/icons.util";
import { SearchList } from "./components/SearchList";
import type { Userstyle } from "./types";

export default function SearchUserstyles() {
  const renderItem = (identifier: string, userstyle: Userstyle) => {
    const githubLink = `https://github.com/catppuccin/userstyles/tree/main/styles/${identifier}`;
    const appLink = userstyle.link;

    const formattedAppLink = appLink
      .replace("https://", "")
      .replace("http://", "")
      .replace("www.", "")
      .replace(/\/$/, "");

    return (
      <List.Item
        key={identifier}
        title={userstyle.name}
        subtitle={`Categories: ${userstyle.categories?.join(", ") || "None"}`}
        accessories={[{ text: formattedAppLink }, { text: `Maintainers: ${userstyle["current-maintainers"].length}` }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={githubLink} title="Open GitHub" />
            <Action.OpenInBrowser url={appLink} title="Open Website" />
            <Action.CopyToClipboard content={appLink} title="Copy Website Link" />
            {userstyle.note && <Action.CopyToClipboard content={userstyle.note} title="Copy Note" />}
          </ActionPanel>
        }
        icon={{
          value: userstyle.icon
            ? getIcon(userstyle.icon, userstyle.color as ColorName)
            : getDefaultIcon(userstyle.color as ColorName),
          tooltip: identifier,
        }}
      />
    );
  };

  return (
    <SearchList<Userstyle> dataKey="userstyles" searchBarPlaceholder="Search userstyles..." renderItem={renderItem} />
  );
}
