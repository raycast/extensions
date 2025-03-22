import { HistoryEntry, Tab } from "../interfaces";
import { ReactElement } from "react";
import { getFavicon } from "@raycast/utils";
import { List } from "@raycast/api";
import { BraveActions } from ".";

export class BraveListItems {
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
      actions={<BraveActions.TabHistory title={title} url={url} profile={profile} />}
    />
  );
}

function TabListItem(props: { tab: Tab; useOriginalFavicon: boolean }) {
  return (
    <List.Item
      title={props.tab.title}
      subtitle={props.tab.urlWithoutScheme()}
      keywords={[props.tab.urlWithoutScheme()]}
      actions={<BraveActions.TabList tab={props.tab} />}
      icon={props.useOriginalFavicon ? props.tab.favicon : props.tab.googleFavicon()}
    />
  );
}
