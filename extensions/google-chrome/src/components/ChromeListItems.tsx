import { HistoryEntry, Tab } from "../interfaces";
import { ReactElement } from "react";
import { getFavicon } from "@raycast/utils";
import { List } from "@raycast/api";
import { ChromeActions } from ".";

export class ChromeListItems {
  public static TabList = TabListItem;
  public static TabHistory = HistoryItem;
}

// Helper function to safely get favicon for potentially invalid URLs
function getSafeFavicon(url: string) {
  // Filter out known problematic URL schemes
  const invalidSchemes = ["javascript:", "data:", "about:", "chrome:", "file:"];
  const urlLower = url.toLowerCase().trim();

  // Check if URL starts with any invalid scheme
  if (invalidSchemes.some((scheme) => urlLower.startsWith(scheme))) {
    return { source: "" };
  }

  // Validate URL format
  try {
    new URL(url);
    return getFavicon(url);
  } catch {
    // Return empty icon for any other invalid URLs
    return { source: "" };
  }
}

function HistoryItem({
  profile,
  entry: { url, title, id },
  type,
}: {
  entry: HistoryEntry;
  profile: string;
  type: "History" | "Bookmark";
}): ReactElement {
  return (
    <List.Item
      id={`${profile}-${type}-${id}`}
      title={title}
      subtitle={url}
      icon={getSafeFavicon(url)}
      actions={<ChromeActions.TabHistory title={title} url={url} profile={profile} />}
    />
  );
}

function TabListItem(props: { tab: Tab; useOriginalFavicon: boolean; onTabClosed?: () => void }) {
  return (
    <List.Item
      title={props.tab.title}
      subtitle={props.tab.urlWithoutScheme()}
      keywords={[props.tab.urlWithoutScheme()]}
      actions={<ChromeActions.TabList tab={props.tab} onTabClosed={props.onTabClosed} />}
      icon={props.useOriginalFavicon ? props.tab.realFavicon() : props.tab.googleFavicon()}
    />
  );
}
