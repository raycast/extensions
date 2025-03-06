import React from "react";
import { ActionPanel, List } from "@raycast/api";
import { bin, recentEntry, toolsInstall, useUrl } from "./util";
import { HelpTextDetail, tbUrl } from "./components/HelpTextDetail";
import { OpenJetBrainsToolbox } from "./components/OpenJetBrainsToolbox";
import { RecentProject } from "./components/RecentProject";
import { OpenInJetBrainsApp } from "./components/OpenInJetBrainsApp";
import { AppDrop } from "./components/AppDrop";
import { useAppHistory } from "./useAppHistory";

export default function ProjectList(): React.JSX.Element {
  const {
    isLoading,
    toolboxApp,
    appHistory,
    myFavs,
    filter,
    setFilter,
    favActions,
    sortOrder,
    setSortOrder,
    toggles,
    recent,
    visitActions,
  } = useAppHistory();
  const screenshotMode = toggles.screenshotMode.value;

  if (isLoading || toolboxApp === undefined) {
    return <List searchBarPlaceholder={`Search recent projects…`} isLoading={true} />;
  } else if (toolboxApp === false) {
    const message = [
      "# Unable to find JetBrains Toolbox",
      `Please check that you have installed [JetBrains Toolbox](${tbUrl})`,
    ];
    return <HelpTextDetail message={message} toolbox={undefined} />;
  } else if (!toolboxApp.isV2) {
    const message = [
      `# Unsupported Version of JetBrains Toolbox: ${toolboxApp.version}`,
      "This extension only support version 2 of JetBrains Toolbox",
      `Please check that you have installed the latest [JetBrains Toolbox](${tbUrl})`,
    ];
    return <HelpTextDetail message={message} toolbox={toolboxApp} />;
  } else if (appHistory.length === 0) {
    const message = [
      "# Unable to find any JetBrains Toolbox apps",
      `Please check that you have installed [JetBrains Toolbox](${tbUrl}) and added at least one IDE.`,
      `If you have specified a custom "Tools install location" you'll need to set that in the preferences for this extension, this is currently set to \`${toolsInstall}\`.`,
    ];
    return <HelpTextDetail message={message} toolbox={toolboxApp} />;
  } else if (
    !appHistory.reduce((exists, appHistory) => exists || appHistory.tool !== false || appHistory.url !== false, false)
  ) {
    const missingTools = appHistory
      .filter((appHistory) => appHistory.tool !== appHistory.toolName && appHistory.toolName !== false)
      .map((appHistory) => appHistory.toolName);
    const plural = missingTools.length > 1;
    const message = [
      "# There was a problem finding the JetBrains shell scripts",
      "We were unable to find shell scripts, ensure you have the **Generate Shell scripts** option checked in *JetBrains Toolbox* under *Settings*.",
      `If you have set a custom path for your shell scripts (in JetBrains Toolbox), you must also set that in the settings for this extension. This is currently set to \`${bin}\`.`,
      missingTools.length > 0
        ? `The missing ${plural ? "scripts" : "script"} ${plural ? "are" : "is"} \`${missingTools.join(
            "`, `"
          )}\` please check ${plural ? "they are" : "it is"} available using ${plural ? "e.g." : ""} \`which ${
            missingTools[0]
          }\` from a Terminal window`
        : "",
      useUrl
        ? "Additionally, we were unable to find a protocol url link to fallback on, please ensure you are using the latest version of JetBrains Toolbox and any apps you are using."
        : "You can also enable the extension preference to fallback to protocol url, though that is a less reliable method of opening projects.",
    ];
    return <HelpTextDetail message={message} toolbox={toolboxApp} />;
  }

  const defaultActions = (
    <>
      {appHistory.map((tool) => (
        <OpenInJetBrainsApp key={tool.title} tool={tool} recent={null} visit={null} />
      ))}
      <OpenJetBrainsToolbox app={toolboxApp} />
    </>
  );

  return (
    <List
      searchBarPlaceholder={`Search recent projects…`}
      actions={<ActionPanel children={defaultActions} />}
      searchBarAccessory={<AppDrop filter={filter} onChange={setFilter} appHistories={appHistory} />}
    >
      {myFavs.length ? (
        <List.Section title="Favourites" subtitle={screenshotMode ? "⌘+F to remove from favorites" : undefined}>
          {myFavs
            .filter((fav) => ["", "all", "recent"].includes(filter) || fav.app.name === filter)
            .map((fav) => (
              <RecentProject
                key={fav.appName + fav.path}
                app={appHistory.find((history) => history.title === fav.appName) || appHistory[0]}
                recent={fav}
                tools={appHistory}
                toolbox={toolboxApp}
                remFav={favActions.remove}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                toggles={toggles}
                visit={visitActions.visit}
              />
            ))}
        </List.Section>
      ) : null}
      {["", "recent"].includes(filter) && (
        <List.Section title={"Recent"} subtitle={screenshotMode ? "⌘+F to add to favorites" : undefined}>
          {(recent ?? [])
            .filter(
              (entry) => myFavs.find((fav) => fav.path === entry.path && fav.appName === entry.appName) === undefined
            )
            .slice(0, filter === "recent" ? recent.length : 10)
            .map((recent) => (
              <RecentProject
                key={`${recent.appName}-${recent.path}`}
                app={recent.app}
                recent={recent}
                tools={appHistory}
                toolbox={toolboxApp}
                addFav={favActions.add}
                hide={favActions.hide}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                toggles={toggles}
                visit={visitActions.visit}
              />
            ))}
        </List.Section>
      )}
      {appHistory
        .filter((app) => ["", "all", app.name].includes(filter))
        .map((app) => (
          <List.Section
            title={app.name}
            key={app.title}
            subtitle={screenshotMode ? "⌘+F to add to favorites – ⌃+S to change application order" : app.version}
          >
            {(recent ?? [])
              .filter((entry) => entry.app.name === app.name)
              .filter(
                (entry) =>
                  filter === "" ||
                  myFavs.find((fav) => fav.path === entry.path && fav.app.name === entry.app.name) === undefined
              )
              .map((recent: recentEntry) => (
                <RecentProject
                  key={`${recent.appName}-${recent.path}`}
                  app={recent.app}
                  recent={recent}
                  tools={appHistory}
                  toolbox={toolboxApp}
                  addFav={favActions.add}
                  hide={favActions.hide}
                  sortOrder={sortOrder}
                  setSortOrder={setSortOrder}
                  toggles={toggles}
                  visit={visitActions.visit}
                />
              ))}
          </List.Section>
        ))}
    </List>
  );
}
