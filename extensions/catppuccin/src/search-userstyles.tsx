import { ActionPanel, Action, List } from "@raycast/api";
import { SearchList } from "./components/SearchList";
import { isValidUrl } from "./utils/data.util";
import { getDefaultIcon, getIcon } from "./utils/icons.util";
import type { UserStyleDetails } from "./types";

const getAppLink = (appLink?: string | string[]) => {
  if (!appLink) return undefined;
  return Array.isArray(appLink) ? appLink[0] : appLink;
};

export default function SearchUserStyles() {
  const renderItem = (styleKey: string, userStyleDetails: UserStyleDetails) => {
    const githubLink = `https://github.com/catppuccin/userstyles/tree/main/styles/${styleKey}`;
    const appLink = getAppLink(userStyleDetails.readme?.["app-link"]);
    // remove www http https & trailing slashes if present
    const formattedAppLink = appLink
      .replace("https://", "")
      .replace("http://", "")
      .replace("www.", "")
      .replace(/\/$/, "");

    return (
      <List.Item
        key={styleKey}
        title={Array.isArray(userStyleDetails.name) ? userStyleDetails.name.join(" / ") : userStyleDetails.name}
        subtitle={`Categories: ${userStyleDetails.categories?.join(", ") || "None"}`}
        accessories={appLink ? [{ text: formattedAppLink }] : undefined}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={githubLink} title="Open GitHub" />
            {appLink && isValidUrl(appLink) && <Action.OpenInBrowser url={appLink} title="Open App Link" />}
          </ActionPanel>
        }
        icon={{
          value: userStyleDetails.icon
            ? getIcon(userStyleDetails.icon, userStyleDetails.color)
            : getDefaultIcon(userStyleDetails.color),
          tooltip: styleKey,
        }}
      />
    );
  };

  const filterFunction = (styleKey: string, userStyleDetails: UserStyleDetails, searchText: string) => {
    const lowerSearchText = searchText.toLowerCase();
    const styleName = Array.isArray(userStyleDetails.name) ? userStyleDetails.name.join(" ") : userStyleDetails.name;
    return styleName.toLowerCase().includes(lowerSearchText) || styleKey.toLowerCase().includes(lowerSearchText);
  };

  return (
    <SearchList<UserStyleDetails>
      dataKey="styles"
      searchBarPlaceholder="Search userstyles..."
      renderItem={renderItem}
      filterFunction={filterFunction}
    />
  );
}
