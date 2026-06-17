import { HistoryEntry, Tab } from "../interfaces";
import { ReactElement } from "react";
import { getFavicon } from "@raycast/utils";
import { List, Icon, Color } from "@raycast/api";
import { ChromeActions } from ".";

export class ChromeListItems {
  public static TabList = TabListItem;
  public static TabHistory = HistoryItem;
}

// Helper function to safely get favicon for potentially invalid URLs
// Returns { icon, isInvalid } to allow caller to handle invalid URLs appropriately
function getSafeFavicon(url: string): { icon: List.Item.Props["icon"]; isInvalid: boolean } {
  // Filter out known problematic URL schemes
  const invalidSchemes = ["javascript:", "data:", "about:", "chrome:", "file:"];
  const urlLower = url.toLowerCase().trim();

  // Check if URL starts with any invalid scheme
  if (invalidSchemes.some((scheme) => urlLower.startsWith(scheme))) {
    return {
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      isInvalid: true,
    };
  }

  // Validate URL format
  try {
    new URL(url);
    return { icon: getFavicon(url), isInvalid: false };
  } catch {
    // Return warning icon for any other invalid URLs
    return {
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      isInvalid: true,
    };
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
  const { icon, isInvalid } = getSafeFavicon(url);

  return (
    <List.Item
      id={`${profile}-${type}-${id}`}
      title={title}
      subtitle={url}
      icon={icon}
      accessories={
        isInvalid
          ? [{ text: "⚠️ Invalid URL - Cannot open", tooltip: "This URL uses an unsupported protocol" }]
          : undefined
      }
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
