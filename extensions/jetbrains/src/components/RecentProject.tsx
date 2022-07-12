import { Action, ActionPanel, Application, Icon, List, useNavigation } from "@raycast/api";
import { OpenJetBrainsToolbox } from "./OpenJetBrainsToolbox";
import React, { useMemo } from "react";
import { AppHistory, recentEntry } from "../util";
import { OpenInJetBrainsApp } from "./OpenInJetBrainsApp";
import { SortTools } from "../sortTools";

interface RecentProjectProps {
  app: AppHistory;
  recent: recentEntry;
  tools: AppHistory[];
  toolbox: Application;
  addFav?: (item: string) => Promise<void>;
  remFav?: (item: string) => Promise<void>;
  sortOrder: string;
  setSortOrder: (currentOrder: string) => void;
  screenshotMode: boolean;
  toggleScreenshotMode: () => void;
}

export function RecentProject({
  app,
  recent,
  tools,
  toolbox,
  addFav,
  remFav,
  sortOrder,
  setSortOrder,
  screenshotMode,
  toggleScreenshotMode,
}: RecentProjectProps): JSX.Element {
  const { push, pop } = useNavigation();
  const otherTools = tools.filter((tool) => tool.title !== app.title);

  const keywords = useMemo(() => {
    const splitPath = recent.path.split("/");
    return [
      ...new Set(
        [
          recent.path,
          ...splitPath,
          ...splitPath.map((pathSegment) => pathSegment.split("-").join(" ")),
          ...splitPath.map((pathSegment) => pathSegment.split("_").join(" ")),
          app.title,
        ].filter((keyword) => !!keyword)
      ),
    ];
  }, [recent.path, app.title]);

  return (
    <List.Item
      accessories={[{ text: app.title }]}
      title={recent.title}
      keywords={keywords}
      icon={recent.icon}
      subtitle={recent.parts}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInJetBrainsApp tool={app} recent={recent} />
            <Action.ShowInFinder path={recent.path} />
            {recent.exists ? <Action.OpenWith path={recent.path} /> : null}
            <Action.CopyToClipboard
              title="Copy Path"
              content={recent.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {otherTools.map((tool) => (
              <OpenInJetBrainsApp key={`${tool.title}-${recent.path}`} tool={tool} recent={recent} />
            ))}
            <OpenJetBrainsToolbox app={toolbox} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {addFav && (
              <Action
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                title="Add To Fav"
                onAction={() => addFav(recent.path)}
              />
            )}
            {remFav && (
              <Action
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                title="Remove from Fav"
                onAction={() => remFav(recent.path)}
              />
            )}
            <Action
              icon={Icon.List}
              title="Change Application Sort Order"
              shortcut={{ modifiers: ["ctrl"], key: "s" }}
              onAction={() =>
                push(
                  <SortTools
                    sortOrder={sortOrder}
                    saveSortOrder={setSortOrder}
                    tools={tools}
                    pop={pop}
                    screenshotMode={screenshotMode}
                    toggleScreenshotMode={toggleScreenshotMode}
                  />
                )
              }
            />
            <Action
              icon={Icon.Window}
              title={`Toggle screenshot mode ${screenshotMode ? "off" : "on"}`}
              onAction={toggleScreenshotMode}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
