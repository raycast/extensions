import { HistoryEntry, Tab } from "../interfaces";
import { ReactElement } from "react";
import { getFavicon } from "@raycast/utils";
import { List } from "@raycast/api";
import { ChromeActions } from ".";

export class ChromeListItems {
  public static TabList = TabListItem;
  public static TabHistory = HistoryItem;
}

function HistoryItem({ profile, entry: { url, title, id } }: { entry: HistoryEntry; profile: string }): ReactElement {
  return (
    <List.Item
      id={`${profile}-${id}`}
      title={title}
      subtitle={url}
      icon={getFavicon(url)}
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
      icon={props.useOriginalFavicon ? props.tab.favicon : props.tab.googleFavicon()}
    />
  );
}
