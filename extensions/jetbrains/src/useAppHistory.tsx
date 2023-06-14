import { Application } from "@raycast/api";
import { AppHistory, getHistory, getJetBrainsToolboxApp, loadAppEntries, recentEntry } from "./util";
import { FavList } from "raycast-hooks/src/hooks/useFavorites";
import { useFavorites, usePreferences } from "raycast-hooks";
import { useEffect, useReducer } from "react";
import { sortTools } from "./sortTools";

function appHistorySorter(results: AppHistory[], sortOrder: string) {
  let order = String(sortOrder).split(",");
  if (sortOrder === "" || order.length === 0) {
    order = results.map((ah) => ah.title).sort();
  }
  return results.sort(sortTools(order));
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
        isLoading: false,
        appHistory: appHistorySorter(action.results, state.sortOrder),
        all: allReducer(action.results),
        myFavs: myFavReducer(state.favourites, allReducer(action.results)),
      };
    case "finished":
      return {
        ...state,
        isLoading: false,
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
  isLoading: true,
  appHistory: [],
  sortOrder: "",
  filter: "",
  all: [],
  favourites: [],
  myFavs: [],
};

export interface State {
  isLoading: boolean;
  sortOrder: string;
  filter: string;
  toolboxApp?: Application;
  history?: AppHistory[];
  appHistory: AppHistory[];
  favourites: FavList;
  all: recentEntry[];
  myFavs: recentEntry[];
}

export type Action =
  | { type: "setToolboxApp"; results: Application | undefined }
  | { type: "setHistory"; results: AppHistory[] }
  | { type: "setEntries"; results: AppHistory[] }
  | { type: "setSortOrder"; results: string }
  | { type: "setFavourites"; results: FavList }
  | { type: "setFilter"; results: string }
  | { type: "finished" };

export function allReducer(results: AppHistory[]): recentEntry[] {
  return results.reduce((all, appHistory) => [...all, ...(appHistory?.entries ?? [])], [] as recentEntry[]);
}

export function myFavReducer(favourites: FavList, all: recentEntry[]): recentEntry[] {
  return favourites
    .map((path) => all.find((entry) => path === entry.path))
    .filter((entry): entry is recentEntry => Boolean(entry));
}

export interface appHistoryReturn {
  isLoading: boolean;
  toolboxApp: Application | undefined;
  appHistory: AppHistory[];
  myFavs: recentEntry[];
  filter: string;
  dispatch: React.Dispatch<Action>;
  histories: FavList[];
  favActions: {
    add: (item: string) => Promise<void>;
    remove: (item: string) => Promise<void>;
    reset: () => Promise<void>;
  };
  sortOrder: string | boolean;
  screenshotMode: string | boolean;
  prefActions: { update: (pref: string, value: boolean | string) => Promise<void>; reset: () => void };
}

export function useAppHistory(): appHistoryReturn {
  const [{ sortOrder, screenshotMode }, prefActions] = usePreferences({ sortOrder: "", screenshotMode: false });
  const [favourites, histories, setHistories, favActions] = useFavorites("history", []);
  const [{ isLoading, toolboxApp, history, appHistory, myFavs, filter, ...rest }, dispatch] = useReducer(
    projectsReducer,
    {
      ...initialState,
      sortOrder: String(sortOrder),
      favourites,
    }
  );

  useEffect(() => {
    getJetBrainsToolboxApp().then((toolboxApp) => dispatch({ type: "setToolboxApp", results: toolboxApp }));
    getHistory().then((history) => dispatch({ type: "setHistory", results: history }));
  }, []);

  useEffect(() => {
    if (history === undefined) return;
    loadAppEntries(history).then((entries) => dispatch({ type: "setEntries", results: entries }));
  }, [history]);

  useEffect(() => {
    if (sortOrder === rest.sortOrder) {
      return;
    }
    dispatch({ type: "setSortOrder", results: String(sortOrder) });
  }, [sortOrder, rest.sortOrder]);

  useEffect(() => {
    if (favourites === rest.favourites) {
      return;
    }
    dispatch({ type: "setFavourites", results: favourites });
  }, [favourites, rest.favourites]);

  useEffect(() => {
    setHistories(...appHistory.map((history) => (history?.entries ?? []).map((entry) => entry.path)));
  }, [appHistory, filter]);

  return {
    isLoading: isLoading || histories.length === 0,
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
  };
}
