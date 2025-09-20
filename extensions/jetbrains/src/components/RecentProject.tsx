import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { OpenJetBrainsToolbox } from "./OpenJetBrainsToolbox";
import React, { useMemo } from "react";
import { AppHistory, recentEntry, ToolboxApp } from "../util";
import { OpenInJetBrainsApp } from "./OpenInJetBrainsApp";
import { SortTools } from "../sortTools";
import { entryAppAction, Toggles } from "../useAppHistory";

interface RecentProjectProps {
  app: AppHistory;
  recent: recentEntry;
  tools: AppHistory[];
  toolbox: ToolboxApp;
  addFav?: (path: string, appId: string) => Promise<void>;
  remFav?: (item: string) => Promise<void>;
  hide?: (path: string) => Promise<void>;
  sortOrder: string[];
  setSortOrder: (currentOrder: string[]) => Promise<void>;
  visit: entryAppAction;
  toggles: Toggles;
}

interface FavActionSectionParams {
  recent?: recentEntry;
  addFav?: ((path: string, appId: string) => Promise<void>) | undefined;
  remFav?: ((item: string) => Promise<void>) | undefined;
  hide?: ((item: string) => Promise<void>) | undefined;
  tools: AppHistory[];
  sortOrder: string[];
  setSortOrder: (currentOrder: string[]) => Promise<void>;
  toggles: Toggles;
}

function FavActionSection({
  recent,
  addFav,
  remFav,
  hide,
  sortOrder,
  setSortOrder,
  tools,
  toggles,
}: FavActionSectionParams) {
  const { push, pop } = useNavigation();
  return (
    <ActionPanel.Section>
      {addFav && recent && (
        <Action
          icon={Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          title="Add To Fav"
          onAction={() => addFav(recent?.path, recent?.app.channelId)}
        />
      )}
      {remFav && recent && (
        <Action
          icon={Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          title="Remove From Fav"
          onAction={() => remFav(recent?.path)}
        />
      )}
      {hide && recent && (
        <Action
          icon={Icon.EyeDisabled}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
          title="Hide Project"
          onAction={() => hide(recent?.path)}
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
              screenshotMode={toggles.screenshotMode.value}
            />
          )
        }
      />
      {Object.keys(toggles).map((key) => {
        const toggle = toggles[key as keyof Toggles];
        return (
          <Action
            key={key}
            icon={toggle.icon}
            title={`Toggle ${toggle.name} ${toggle.value ? "Off" : "On"}`}
            onAction={toggle.toggle}
          />
        );
      })}
    </ActionPanel.Section>
  );
}

export function RecentProject({
  app,
  recent,
  tools,
  toolbox,
  addFav,
  remFav,
  hide,
  sortOrder,
  setSortOrder,
  toggles,
  visit,
}: RecentProjectProps): React.JSX.Element {
  const otherTools = tools.filter((tool) => tool.title !== app.title);
  const showDates = toggles.showDates.value;

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

  if (recent.title === "missing" && recent.path === "missing") {
    return (
      <List.Item
        title={app.name}
        icon={{
          source: Icon.Exclamationmark3,
          tintColor: Color.Red,
        }}
        accessories={[
          {
            tag: "Config Error",
            icon: {
              source: Icon.QuestionMarkCircle,
              tintColor: Color.Yellow,
            },
            tooltip: "Relaunching JetBrains Toolbox should fix the problem",
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <OpenJetBrainsToolbox app={toolbox} relaunch />
              <OpenInJetBrainsApp tool={app} visit={null} recent={null} />
            </ActionPanel.Section>
            <FavActionSection tools={tools} sortOrder={sortOrder} setSortOrder={setSortOrder} toggles={toggles} />
          </ActionPanel>
        }
      />
    );
  }

  if (recent.title === "unsupported" && recent.path === "unsupported") {
    return (
      <List.Item
        title={app.name}
        icon={recent.icon}
        accessories={[
          {
            icon: {
              source: Icon.QuestionMarkCircle,
              tintColor: Color.Yellow,
            },
            tag: "Projects Unavailable",
            tooltip: "This application does not have project data in a format usable by the extension",
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <OpenInJetBrainsApp key={`${app.title}-${recent.path}`} tool={app} recent={null} visit={null} />
            </ActionPanel.Section>
            <FavActionSection tools={tools} sortOrder={sortOrder} setSortOrder={setSortOrder} toggles={toggles} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.Item
      accessories={[
        showDates
          ? {
              icon: Icon.Clock,

              // text: 'Opened',
              tag: {
                value: new Date(recent.opened),
                color: Color.Yellow,
              },
              tooltip: `Last opened ${new Date(recent.opened).toLocaleString()}`,
            }
          : {},
        {
          tag: {
            value: app.name,
            color: [Color.PrimaryText].sort(() => 0.5 - Math.round(Math.random())).pop(),
          },
        },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={recent.appName} text={recent.title} />
              <List.Item.Detail.Metadata.Link title="Path" text={recent.path} target={`file://${recent.path}`} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      title={recent.title}
      icon={recent.icon}
      keywords={keywords}
      subtitle={recent.parts}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInJetBrainsApp tool={app} recent={recent} visit={visit} />
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
              <OpenInJetBrainsApp key={`${tool.title}-${recent.path}`} tool={tool} recent={recent} visit={visit} />
            ))}
            <OpenJetBrainsToolbox app={toolbox} />
          </ActionPanel.Section>
          <FavActionSection
            tools={tools}
            recent={recent}
            addFav={addFav}
            remFav={remFav}
            hide={hide}
            toggles={toggles}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />
        </ActionPanel>
      }
    />
  );
}
