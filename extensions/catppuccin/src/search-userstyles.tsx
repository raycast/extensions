import { ActionPanel, Action, List } from "@raycast/api";
import { SearchList } from "./components/SearchList";
import { getDefaultIcon, getIcon } from "./utils/icons.util";
import type { Userstyle } from "./types";

const getAppLink = (appLink: string | string[]) => {
  return Array.isArray(appLink) ? appLink[0] : appLink;
};

export default function SearchUserstyles() {
  const renderItem = (identifier: string, userstyle: Userstyle) => {
    const githubLink = `https://github.com/catppuccin/userstyles/tree/main/styles/${identifier}`;
    const appLink = getAppLink(userstyle.readme["app-link"]);
    // remove www http https & trailing slashes if present
    const formattedAppLink = appLink
      .replace("https://", "")
      .replace("http://", "")
      .replace("www.", "")
      .replace(/\/$/, "");

    return (
      <List.Item
        key={identifier}
        title={Array.isArray(userstyle.name) ? userstyle.name.join(" / ") : userstyle.name}
        subtitle={`Categories: ${userstyle.categories?.join(", ") || "None"}`}
        accessories={[{ text: formattedAppLink }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={githubLink} title="Open GitHub" />
            <Action.OpenInBrowser url={appLink} title="Open App Link" />
          </ActionPanel>
        }
        icon={{
          value: userstyle.icon ? getIcon(userstyle.icon, userstyle.color) : getDefaultIcon(userstyle.color),
          tooltip: identifier,
        }}
      />
    );
  };

  return (
    <SearchList<Userstyle> dataKey="userstyles" searchBarPlaceholder="Search userstyles..." renderItem={renderItem} />
  );
}
