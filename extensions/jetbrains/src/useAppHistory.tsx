import {
  addFav,
  AppHistory,
  frecencySorting,
  getHistory,
  getJetBrainsToolboxApp,
  getSettings,
  hideProject,
  loadAppEntries,
  nameFromId,
  recentEntry,
  replaceInFile,
  rmFav,
  setSort,
  ToolboxApp,
} from "./util";
import { usePreferences } from "raycast-hooks";
import React, { useEffect, useReducer } from "react";
import { sortTools } from "./sortTools";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { captureException, Icon, Image } from "@raycast/api";

function appHistorySorter(results: AppHistory[], sortOrder: string[]) {
  return results.sort(sortTools(sortOrder));
}

function projectsReducer(state: State, action: Action): State {
  switch (action.type) {
    case "setToolboxApp":
      if (action.results === undefined) {
        return { ...state, toolboxApp: false, isLoading: false };
      }
      return { ...state, toolboxApp: action.results };
    case "setHistory":
      return { ...state, history: action.results };
    case "setEntries":
      return {
        ...state,
        isLoading: false,
        appHistory: appHistorySorter(
          action.results.map((appHistory) => ({
            ...appHistory,
            entries: (appHistory.entries ?? []).filter(
              (entry) => !(state.settingsData.hidden ?? []).includes(entry.path)
            ),
          })),
          state.settingsData.sortOrder
        ),
        all: allReducer(action.results, state.settingsData.hidden),
        myFavs: myFavReducer(state.settingsData.favourites, allReducer(action.results, state.settingsData.hidden)),
      };
    case "finished":
      return {
        ...state,
        isLoading: false,
      };
    case "setSortOrder":
      return {
        ...state,
        settingsData: {
          ...state.settingsData,
          sortOrder: action.results,
        },
        appHistory: appHistorySorter(state.appHistory, action.results),
      };
    case "setHidden":
      return {
        ...state,
        settingsData: {
          ...state.settingsData,
          hidden: action.results,
        },
        all: allReducer(state.appHistory, action.results),
        appHistory: appHistorySorter(state.appHistory, state.settingsData.sortOrder),
      };
    case "setFavourites":
      return {
        ...state,
        settingsData: {
          ...state.settingsData,
          favourites: action.results,
        },
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
  isLoading: true,
  appHistory: [],
  sortOrder: "",
  filter: "",
  all: [],
  favourites: [],
  myFavs: [],
};

export interface Favourite {
  path: string;
  appId: string | undefined;
}

export interface SettingsData {
  favourites: Favourite[];
  sortOrder: string[];
  hidden: string[];
}

export interface State {
  isLoading: boolean;
  filter: string;
  toolboxApp?: ToolboxApp | false;
  history?: AppHistory[];
  appHistory: AppHistory[];
  all: recentEntry[];
  myFavs: recentEntry[];
  settingsData: SettingsData;
}

export type Action =
  | { type: "setToolboxApp"; results: ToolboxApp | undefined }
  | { type: "setHistory"; results: AppHistory[] }
  | { type: "setEntries"; results: AppHistory[] }
  // | { type: "setSettingsData"; results: SettingsData }
  | { type: "setSortOrder"; results: string[] }
  | { type: "setFavourites"; results: Favourite[] }
  | { type: "setHidden"; results: string[] }
  | { type: "setFilter"; results: string }
  | { type: "finished" };

export function allReducer(results: AppHistory[], hidden: string[]): recentEntry[] {
  return results
    .reduce(
      (all, appHistory) => [
        ...all,
        ...(appHistory.entries ?? [])
          .filter((entry) => !(hidden ?? []).includes(entry.path))
          .map(
            (entry) =>
              ({
                ...entry,
                app: {
                  ...appHistory,
                  entries: undefined,
                },
              } as recentEntry)
          ),
      ],
      [] as recentEntry[]
    )
    .sort((a, b) => {
      const aOpened = isNaN(a.opened) ? -Infinity : a.opened;
      const bOpened = isNaN(b.opened) ? -Infinity : b.opened;
      return bOpened - aOpened;
    });
}

export function myFavReducer(favourites: Favourite[], all: recentEntry[]): recentEntry[] {
  return favourites
    .map(({ path, appId }) =>
      all
        .filter((entry) => nameFromId(appId ?? "") === nameFromId(entry.app.channelId))
        .find((entry: recentEntry) => path === entry.path)
    )
    .filter((entry): entry is recentEntry => Boolean(entry));
}

export type entryAppAction = (entry: recentEntry, app: AppHistory) => void;

export interface appHistoryReturn {
  isLoading: boolean;
  toolboxApp: ToolboxApp | undefined | false;
  appHistory: AppHistory[];
  myFavs: recentEntry[];
  filter: string;
  setFilter: (value: string) => void;
  dispatch: React.Dispatch<Action>;
  favActions: {
    add: (path: string, appId: string) => Promise<void>;
    remove: (item: string) => Promise<void>;
    hide: (path: string) => Promise<void>;
  };
  visitActions: {
    visit: entryAppAction;
    reset: (entry: recentEntry) => void;
  };
  hidden: string[];
  sortOrder: string[];
  setSortOrder: (currentOrder: string[]) => Promise<void>;
  toggles: Toggles;
  recent: recentEntry[];
}

export type Toggles = {
  screenshotMode: Toggle;
  showDates: Toggle;
};

export interface Toggle {
  name: string;
  value: boolean;
  toggle: () => void;
  icon: Image.ImageLike;
}

export interface JBSettings {
  favourites: Favourite[];
  hidden: string[];
  sortOrder: string[];
  error?: string;
}

const initialSettings: JBSettings = {
  favourites: [],
  hidden: [],
  sortOrder: [],
};

export function useAppHistory(): appHistoryReturn {
  const [{ screenshotMode, filter, showDates }, prefActions] = usePreferences({
    screenshotMode: false,
    filter: "",
    showDates: true,
  });
  const toggleScreenshotMode = () => prefActions.update("screenshotMode", !screenshotMode);
  const toggleDates = () => prefActions.update("showDates", !showDates);
  const setFilter = (value: string) => prefActions.update("filter", value);
  const {
    isLoading: settingsIsLoading,
    data: settingsData,
    revalidate: settingsRevalidate,
  } = useCachedPromise(
    async (): Promise<JBSettings> => {
      return getSettings()
        .then((settings) => {
          if (settings === null || settings === undefined) {
            throw new Error("Unable to load settings");
          }
          return settings;
        })
        .then((settings) => ({
          sortOrder: settings.ordering.installed,
          projects: settings.projects
            ? Object.keys(settings.projects).map((projectPath) => ({
                projectPath,
                config: settings.projects?.[projectPath],
              }))
            : [],
        }))
        .then(({ sortOrder, projects }) => ({
          favourites: projects
            .filter((project) => project.config?.favorite ?? false)
            .map((project) => ({ path: project.projectPath, appId: project.config?.launchMethod })),
          hidden: projects
            .filter((project) => (project.config?.hidden ?? false) !== false)
            .map((project) => project.projectPath),
          sortOrder,
        }))
        .catch((err) => {
          captureException(err);
          return initialSettings;
        });
    },
    [],
    {
      initialData: initialSettings,
    }
  );
  const [{ isLoading, toolboxApp, history, appHistory, myFavs, all, ...rest }, dispatch] = useReducer(projectsReducer, {
    ...initialState,
    settingsData,
    filter: String(filter),
  });

  useEffect(() => {
    getJetBrainsToolboxApp().then((toolboxApp) => dispatch({ type: "setToolboxApp", results: toolboxApp }));
  }, []);

  useEffect(() => {
    getHistory().then((history) => dispatch({ type: "setHistory", results: history }));
  }, []);
  // const { isLoading: cachedHistoryLoading } = useCachedPromise(() => getHistory(), [], {
  //   keepPreviousData: true,
  //   onData: (history => dispatch({ type: "setHistory", results: history }))
  // })
  useEffect(() => {
    if (toolboxApp === undefined || toolboxApp === false) {
      return;
    }
    if (!toolboxApp.isV2) {
      return dispatch({ type: "finished" });
    }
  }, [toolboxApp]);

  useEffect(() => {
    if (history === undefined) return;
    loadAppEntries(history).then((entries) => dispatch({ type: "setEntries", results: entries }));
  }, [history]);

  useEffect(() => {
    if (settingsData.sortOrder === rest.settingsData.sortOrder) {
      return;
    }
    dispatch({ type: "setSortOrder", results: settingsData.sortOrder });
  }, [settingsData.sortOrder, rest.settingsData.sortOrder]);

  useEffect(() => {
    if (settingsData.hidden === rest.settingsData.hidden) {
      return;
    }
    dispatch({ type: "setHidden", results: settingsData.hidden });
  }, [settingsData.hidden, rest.settingsData.hidden]);

  useEffect(() => {
    if (filter === rest.filter) {
      return;
    }
    dispatch({ type: "setFilter", results: String(filter) });
  }, [filter, rest.filter]);

  useEffect(() => {
    if (settingsData.favourites === rest.settingsData.favourites) {
      return;
    }
    dispatch({ type: "setFavourites", results: settingsData.favourites });
  }, [settingsData.favourites, rest.settingsData.favourites]);

  const {
    data: frecent,
    visitItem,
    resetRanking,
  } = useFrecencySorting<recentEntry>([...all], {
    key: (entry) => `${entry.app.name}.${entry.path}`,
    sortUnvisited: (a, b) => b.opened - a.opened,
  });

  return {
    isLoading: isLoading || settingsIsLoading,
    toolboxApp,
    appHistory,
    myFavs,
    filter: String(filter),
    setFilter,
    dispatch,
    favActions: {
      add: async (path: string, appId: string) => {
        await addFav(path, appId);
        settingsRevalidate();
      },
      remove: async (path: string) => {
        await rmFav(path);
        settingsRevalidate();
      },
      hide: async (path: string) => {
        await hideProject(path);
        settingsRevalidate();
      },
    },
    sortOrder: settingsData.sortOrder,
    hidden: settingsData.hidden,
    setSortOrder: async (sortOrder: string[]) => {
      await setSort(sortOrder);
      settingsRevalidate();
    },
    toggles: {
      screenshotMode: {
        name: "Screenshot Mode",
        value: Boolean(screenshotMode),
        toggle: toggleScreenshotMode,
        icon: Icon.Window,
      },
      showDates: {
        name: "Show Dates",
        value: Boolean(showDates),
        toggle: toggleDates,
        icon: Icon.Calendar,
      },
    },
    recent: frecencySorting ? frecent : all,
    visitActions: {
      visit: (entry: recentEntry) => {
        visitItem(entry).catch((err) => captureException(err));
        // set new opened timestamp
        replaceInFile(entry.xmlFile.path, new RegExp(String(entry.opened), "m"), String(new Date().getTime())).catch(
          (err) => captureException(err)
        );
      },
      reset: (entry: recentEntry) => {
        resetRanking(entry).catch((err) => captureException(err));
      },
    },
  };
}
