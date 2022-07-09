import { GifsResult } from "@giphy/js-fetch-api";
import React, { useReducer, createContext, useEffect } from "react";
import { IGif } from "@giphy/js-types";
import { LocalStorage } from "@raycast/api";

export type AppState = {
  favs: { [key: string]: IGif };
  recents: { [key: string]: IGif };
  gifs?: GifsResult;
  loading: boolean;
  error?: Error;
  searchText: string;
  offset: number;
};

type Action =
  | { type: "loading" }
  | { type: "fetched"; payload: GifsResult }
  | { type: "error"; payload: Error }
  | { type: "setSearchState"; payload: { text?: string; offset?: number } }
  | { type: "setFavs"; payload: { [key: string]: IGif } }
  | { type: "addToFavs"; payload: IGif }
  | { type: "removeFromFavs"; payload: string | number }
  | { type: "setRecents"; payload: { [key: string]: IGif } }
  | { type: "addToRecents"; payload: IGif }
  | { type: "removeFromRecents"; payload: string | number }
  | { type: "clearFavs" }
  | { type: "clearRecents" };

export const initialState: AppState = {
  favs: {},
  recents: {},
  searchText: "",
  offset: 0,
  loading: true,
};

export const AppContext = createContext(initialState);
export const AppDispatchContext = createContext<React.Dispatch<Action>>(() => null);

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case "loading":
      return { ...state, loading: true };
    case "fetched":
      return { ...state, gifs: action.payload, loading: false };
    case "setSearchState":
      return {
        ...state,
        ...((action.payload.text || action.payload.text === "") && { searchText: action.payload.text }),
        ...(action.payload.offset && { offset: action.payload.offset }),
      };
    case "error":
      return { ...state, error: action.payload, loading: false };
    case "setFavs":
      return {
        ...state,
        favs: action.payload,
      };
    case "setRecents":
      return {
        ...state,
        recents: action.payload,
      };
    case "addToFavs":
      LocalStorage.setItem("favs", JSON.stringify({ ...state.favs, [action.payload.id]: action.payload }));
      return {
        ...state,
        favs: { ...state.favs, [action.payload.id]: action.payload },
      };
    case "addToRecents": {
      let recents = { ...state.recents };
      delete recents[action.payload.id];
      recents = { ...recents, [action.payload.id]: action.payload };
      LocalStorage.setItem("recents", JSON.stringify(recents));
      return { ...state, recents };
    }
    case "removeFromFavs": {
      const favs = state.favs;
      delete favs[action.payload];
      LocalStorage.setItem("favs", JSON.stringify(favs));
      return {
        ...state,
        favs,
      };
    }
    case "removeFromRecents": {
      const recents = state.recents;
      delete recents[action.payload];
      LocalStorage.setItem("recents", JSON.stringify(recents));
      return { ...state, recents };
    }
    case "clearFavs":
      LocalStorage.removeItem("favs");
      return {
        ...state,
        favs: {},
      };
    case "clearRecents":
      LocalStorage.removeItem("recents");
      return {
        ...state,
        recents: {},
      };
    default:
      return state;
  }
};

function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    (async () => {
      LocalStorage.getItem("recents").then(
        (res) => res && dispatch({ type: "setRecents", payload: JSON.parse(res as string) as { [key: string]: IGif } })
      );
      LocalStorage.getItem("favs").then(
        (res) => res && dispatch({ type: "setFavs", payload: JSON.parse(res as string) as { [key: string]: IGif } })
      );
    })();
  }, []);

  return (
    <AppDispatchContext.Provider value={dispatch}>
      <AppContext.Provider value={state}>{children}</AppContext.Provider>
    </AppDispatchContext.Provider>
  );
}

export default AppProvider;
