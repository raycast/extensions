import React from "react";
import { ActionPanel, List } from "@raycast/api";
import { bin, recentEntry, toolsInstall, useUrl } from "./util";
import { HelpTextDetail, tbUrl } from "./components/HelpTextDetail";
import { OpenJetBrainsToolbox } from "./components/OpenJetBrainsToolbox";
import { RecentProject } from "./components/RecentProject";
import { OpenInJetBrainsApp } from "./components/OpenInJetBrainsApp";
import { AppDrop } from "./components/AppDrop";
import { useAppHistory } from "./useAppHistory";

export default function ProjectList(): JSX.Element {
  const {
    isLoading,
    toolboxApp,
    appHistory,
    myFavs,
    filter,
    dispatch,
    histories,
    favActions,
    sortOrder,
    screenshotMode,
    prefActions,
  } = useAppHistory();

  if (isLoading) {
    return <List searchBarPlaceholder={`Search recent projects…`} isLoading={true} />;
  } else if (toolboxApp === undefined) {
    const message = [
      "# Unable to find JetBrains Toolbox",
      `Please check that you have installed [JetBrains Toolbox](${tbUrl})`,
    ];
    return <HelpTextDetail message={message} toolbox={undefined} />;
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
      `If you have set a custom path for your shell scripts, that can set that in the settings for this extension, this is currently set to \`${bin}\`.`,
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
        <OpenInJetBrainsApp key={tool.title} tool={tool} recent={null} />
      ))}
      <OpenJetBrainsToolbox app={toolboxApp} />
    </>
  );

  return (
    <List
      searchBarPlaceholder={`Search recent projects…`}
      actions={<ActionPanel children={defaultActions} />}
      searchBarAccessory={
        <AppDrop
          onChange={(value) => dispatch({ type: "setFilter", results: String(value) })}
          appHistories={appHistory}
        />
      }
    >
      {myFavs.length && filter === "" ? (
        <List.Section title="Favourites" subtitle={screenshotMode ? "⌘+F to remove from favorites" : undefined}>
          {myFavs.map((fav) => (
            <RecentProject
              key={fav.path}
              app={appHistory.find((history) => history.title === fav.appName) || appHistory[0]}
              recent={fav}
              tools={appHistory}
              toolbox={toolboxApp}
              remFav={favActions.remove}
              sortOrder={String(sortOrder)}
              setSortOrder={(sortOrder) => prefActions.update("sortOrder", sortOrder)}
              screenshotMode={!!screenshotMode}
              toggleScreenshotMode={() => prefActions.update("screenshotMode", !screenshotMode)}
            />
          ))}
        </List.Section>
      ) : null}
      {appHistory
        .filter((app) => filter === "" || filter === app.title)
        .map((app, id) => (
          <List.Section
            title={app.name}
            key={app.title}
            subtitle={screenshotMode ? "⌘+F to add to favorites – ⌃+S to change application order" : app.version}
          >
            {(app.entries ?? [])
              .filter((entry) => filter !== "" || (histories[id] ?? []).includes(entry.path))
              .map((recent: recentEntry) =>
                recent?.path ? (
                  <RecentProject
                    key={`${app.title}-${recent.path}`}
                    app={app}
                    recent={recent}
                    tools={appHistory}
                    toolbox={toolboxApp}
                    addFav={favActions.add}
                    sortOrder={String(sortOrder)}
                    setSortOrder={(sortOrder) => prefActions.update("sortOrder", sortOrder)}
                    screenshotMode={!!screenshotMode}
                    toggleScreenshotMode={() => prefActions.update("screenshotMode", !screenshotMode)}
                  />
                ) : null
              )}
          </List.Section>
        ))}
    </List>
  );
}
