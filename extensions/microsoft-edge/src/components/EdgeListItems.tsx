import { HistoryEntry, Tab, Workspace, WorkspaceColor, workspaceHexMap } from "../types/interfaces";
import { ReactElement } from "react";
import { getFavicon } from "@raycast/utils";
import { Color, Icon, List } from "@raycast/api";
import { EdgeActions } from ".";

export class EdgeListItems {
  public static TabList = TabListItem;
  public static TabHistory = HistoryItem;
  public static Workspace = WorkspaceItem;
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

function WorkspaceItem({ workspace, profile }: { workspace: Workspace; profile: string }) {
  const getIconColor = (workspaceColor: WorkspaceColor) => {
    return workspaceHexMap[workspaceColor] || workspaceHexMap[WorkspaceColor.Transparent];
  };

  const getAccessories = () => {
    return [
      ...(workspace.shared
        ? [
            {
              tag: {
                value: "Shared",
                color: Color.Magenta,
              },
              icon: Icon.TwoPeople,
            },
          ]
        : []),
      ...(workspace.accent
        ? [
            {
              tag: {
                value: "Open",
                color: Color.Green,
              },
              icon: Icon.ArrowNe,
            },
          ]
        : []),
    ];
  };

  return (
    <List.Item
      key={`${profile}-${workspace.id}`}
      title={workspace.name}
      subtitle={workspace.menuSubtitle}
      icon={{
        source: Icon.Map,
        tintColor: getIconColor(workspace.color),
      }}
      accessories={getAccessories()}
      actions={<EdgeActions.Workspace workspace={workspace} profile={profile} />}
    ></List.Item>
  );
}
