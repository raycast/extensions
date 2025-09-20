import { HistoryEntry, Tab } from "../types/interfaces";
import { ReactElement } from "react";
import { getFavicon } from "@raycast/utils";
import { List } from "@raycast/api";
import { EdgeActions } from ".";

export class EdgeListItems {
  public static TabList = TabListItem;
  public static TabHistory = HistoryItem;
}

function HistoryItem({
  profile,
  entry: { url, title, id },
  icon,
}: {
  entry: HistoryEntry;
  profile: string;
  icon?: string;
}): ReactElement {
  return (
    <List.Item
      id={`${profile}-${id}`}
      title={title}
      subtitle={url}
      icon={icon ?? getFavicon(url)}
      actions={<EdgeActions.TabHistory title={title} url={url} profile={profile} />}
    />
  );
}

function TabListItem(props: { tab: Tab }) {
  return (
    <List.Item
      title={props.tab.title}
      subtitle={props.tab.urlWithoutScheme()}
      keywords={[props.tab.urlWithoutScheme()]}
      actions={<EdgeActions.TabList tab={props.tab} />}
      icon={props.tab.googleFavicon()}
    />
  );
}
