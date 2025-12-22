import { HistoryEntry, Tab } from "../interfaces";
import { ReactElement } from "react";
import { getFavicon } from "@raycast/utils";
import { List, Icon, Color } from "@raycast/api";
import { ChromeActions } from "./chrome-actions";

export class ChromeListItems {
  public static TabList = TabListItem;
  public static TabHistory = HistoryItem;
}

function getSafeFavicon(url: string): { icon: List.Item.Props["icon"]; isInvalid: boolean } {
  const invalidSchemes = ["javascript:", "data:", "about:", "chrome:", "file:"];
  const urlLower = url.toLowerCase().trim();

  if (invalidSchemes.some((scheme) => urlLower.startsWith(scheme))) {
    return {
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      isInvalid: true,
    };
  }

  try {
    new URL(url);
    return { icon: getFavicon(url), isInvalid: false };
  } catch {
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

function TabListItem(props: { tab: Tab; onTabClosed?: () => void }) {
  return (
    <List.Item
      title={props.tab.title}
      subtitle={props.tab.urlWithoutScheme()}
      keywords={[props.tab.urlWithoutScheme()]}
      actions={<ChromeActions.TabList tab={props.tab} onTabClosed={props.onTabClosed} />}
      icon={props.tab.getFaviconImage()}
    />
  );
}
