import React, { useEffect, useReducer } from "react";
import { ActionPanel, Application, List } from "@raycast/api";
import {
  AppHistory,
  bin,
  getHistory,
  getJetBrainsToolboxApp,
  loadAppEntries,
  recentEntry,
  toolsInstall,
  useUrl,
} from "./util";
import { HelpTextDetail, tbUrl } from "./components/HelpTextDetail";
import { OpenJetBrainsToolbox } from "./components/OpenJetBrainsToolbox";
import { RecentProject } from "./components/RecentProject";
import { OpenInJetBrainsApp } from "./components/OpenInJetBrainsApp";
import { AppDrop } from "./components/AppDrop";
import { useFavorites, usePreferences } from "raycast-hooks";
import { FavList } from "raycast-hooks/src/hooks/useFavorites";
import { sortTools } from "./sortTools";

interface State {
  loading: boolean;
  sortOrder: string;
  filter: string;
  toolboxApp?: Application;
  history?: AppHistory[];
  appHistory: AppHistory[];
  favourites: FavList;
  all: recentEntry[];
  myFavs: recentEntry[];
}

type Action =
  | { type: "setToolboxApp"; results: Application | undefined }
  | { type: "setHistory"; results: AppHistory[] }
  | { type: "setEntries"; results: AppHistory[] }
  | { type: "setSortOrder"; results: string }
  | { type: "setFavourites"; results: FavList }
  | { type: "setFilter"; results: string };

function allReducer(results: AppHistory[]) {
  return results.reduce((all, appHistory) => [...all, ...(appHistory?.entries ?? [])], [] as recentEntry[]);
}

function myFavReducer(favourites: FavList, all: recentEntry[]) {
  return favourites
    .map((path) => all.find((entry) => path === entry.path))
    .filter((entry): entry is recentEntry => Boolean(entry));
}

function appHistorySorter(results: AppHistory[], sortOrder: string) {
  return results.filter((app) => app.entries?.length).sort(sortTools(String(sortOrder).split(",")));
}

function projectsReducer(state: State, action: Action): State {
  switch (action.type) {
    case "setToolboxApp":
      return { ...state, toolboxApp: action.results };
    case "setHistory":
      return { ...state, history: action.results };
    case "setEntries":
      return {
        ...state,
        loading: false,
        appHistory: appHistorySorter(action.results, state.sortOrder),
        all: allReducer(action.results),
        myFavs: myFavReducer(state.favourites, allReducer(action.results)),
      };
    case "setSortOrder":
      return {
        ...state,
        sortOrder: action.results,
        appHistory: appHistorySorter(state.appHistory, action.results),
      };
    case "setFavourites":
      return {
        ...state,
        favourites: action.results,
        myFavs: myFavReducer(action.results, state.all),
      };
    case "setFilter":
      return {
        ...state,
        filter: action.results,
      };
  }
}

const initialState = {
  loading: true,
  appHistory: [],
  sortOrder: "",
  filter: "",
  all: [],
  favourites: [],
  myFavs: [],
};

export default function ProjectList(): JSX.Element {
  const [{ loading, toolboxApp, history, appHistory, myFavs, filter }, dispatch] = useReducer(
    projectsReducer,
    initialState
  );
  const [favourites, histories, setHistories, favActions] = useFavorites("history", []);
  const [{ sortOrder, screenshotMode }, prefActions] = usePreferences({ sortOrder: "", screenshotMode: false });

  useEffect(() => {
    getJetBrainsToolboxApp().then((toolboxApp) => dispatch({ type: "setToolboxApp", results: toolboxApp }));
    getHistory().then((history) => dispatch({ type: "setHistory", results: history }));
  }, []);

  useEffect(() => {
    dispatch({ type: "setSortOrder", results: String(sortOrder) });
  }, [sortOrder]);

  useEffect(() => {
    dispatch({ type: "setFavourites", results: favourites });
  }, [favourites]);

  useEffect(() => {
    setHistories(...appHistory.map((history) => (history?.entries ?? []).map((entry) => entry.path)));
  }, [appHistory, filter]);

  useEffect(() => {
    if (history === undefined) return;
    loadAppEntries(history).then((entries) => dispatch({ type: "setEntries", results: entries }));
  }, [history]);

  if (loading) {
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
    const message = [
      "# There was a problem finding the JetBrains shell scripts",
      "We were unable to find shell scripts, ensure you have the **Generate Shell scripts** option checked in *JetBrains Toolbox* under *Settings*.",
      `If you have set a custom path for your shell scripts, that can set that in the settings for this extension, this is currently set to \`${bin}\`.`,
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
              app={appHistory.find((history) => history.title === fav.app) || appHistory[0]}
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
            title={app.title}
            key={app.title}
            subtitle={screenshotMode ? "⌘+F to add to favorites – ⌃+S to change application order" : undefined}
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
