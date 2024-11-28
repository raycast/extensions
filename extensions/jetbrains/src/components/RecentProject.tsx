import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { OpenJetBrainsToolbox } from "./OpenJetBrainsToolbox";
import { useMemo } from "react";
import { AppHistory, recentEntry, ToolboxApp } from "../util";
import { OpenInJetBrainsApp } from "./OpenInJetBrainsApp";
import { SortTools } from "../sortTools";

interface RecentProjectProps {
  app: AppHistory;
  recent: recentEntry;
  tools: AppHistory[];
  toolbox: ToolboxApp;
  addFav?: (item: string) => Promise<void>;
  remFav?: (item: string) => Promise<void>;
  sortOrder: string;
  setSortOrder: (currentOrder: string) => void;
  screenshotMode: boolean;
  toggleScreenshotMode: () => void;
}

interface FavActionSectionParams {
  recent?: recentEntry;
  addFav?: ((item: string) => Promise<void>) | undefined;
  remFav?: ((item: string) => Promise<void>) | undefined;
  tools: AppHistory[];
  sortOrder: string;
  setSortOrder: (currentOrder: string) => void;
  screenshotMode: boolean;
  toggleScreenshotMode: () => void;
}

function FavActionSection({
  recent,
  addFav,
  remFav,
  sortOrder,
  setSortOrder,
  tools,
  screenshotMode,
  toggleScreenshotMode,
}: FavActionSectionParams) {
  const { push, pop } = useNavigation();
  return (
    <ActionPanel.Section>
      {addFav && recent && (
        <Action
          icon={Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          title="Add To Fav"
          onAction={() => addFav(recent.path)}
        />
      )}
      {remFav && recent && (
        <Action
          icon={Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          title="Remove From Fav"
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
        title={`Toggle Screenshot Mode ${screenshotMode ? "Off" : "On"}`}
        onAction={toggleScreenshotMode}
      />
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
  sortOrder,
  setSortOrder,
  screenshotMode,
  toggleScreenshotMode,
}: RecentProjectProps): JSX.Element {
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
              <OpenInJetBrainsApp tool={app} toolboxApp={toolbox} recent={null} />
            </ActionPanel.Section>
            <FavActionSection
              tools={tools}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              screenshotMode={screenshotMode}
              toggleScreenshotMode={toggleScreenshotMode}
            />
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
              <OpenInJetBrainsApp key={`${app.title}-${recent.path}`} tool={app} recent={null} toolboxApp={toolbox} />
            </ActionPanel.Section>
            <FavActionSection
              tools={tools}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              screenshotMode={screenshotMode}
              toggleScreenshotMode={toggleScreenshotMode}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.Item
      accessories={[
        {
          tag: app.name,
        },
      ]}
      title={recent.title}
      icon={recent.icon}
      keywords={keywords}
      subtitle={recent.parts}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInJetBrainsApp tool={app} recent={recent} toolboxApp={toolbox} />
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
              <OpenInJetBrainsApp
                key={`${tool.title}-${recent.path}`}
                tool={tool}
                recent={recent}
                toolboxApp={toolbox}
              />
            ))}
            <OpenJetBrainsToolbox app={toolbox} />
          </ActionPanel.Section>
          <FavActionSection
            tools={tools}
            recent={recent}
            addFav={addFav}
            remFav={remFav}
            screenshotMode={screenshotMode}
            toggleScreenshotMode={toggleScreenshotMode}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />
        </ActionPanel>
      }
    />
  );
}
