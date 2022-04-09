import React from "react";

import type { ServiceName } from "../preferences";
import type { IGif } from "../models/gif";
import { getFavorites, setFavorites } from "../lib/favorites";

export interface AppState {
  service?: ServiceName;
  favIds?: Set<string>;
}

export type AppStateActionType = "add" | "remove" | "replace" | "clear";

export interface AppStateAction {
  type?: AppStateActionType;
  ids?: Array<string | number>;
  service?: ServiceName;
  save?: boolean;
}

export const initialState: AppState = {
  favIds: new Set<string>(),
};

const AppContext = React.createContext({
  state: initialState,
} as {
  state: AppState;
  dispatch: (action: AppStateAction) => void;
});

export default AppContext;

export function reduceAppState(state: AppState, action: AppStateAction) {
  let { favIds } = state;
  const { type, ids } = action;

  if (action.service) {
    state.service = action.service;
  }

  if (type == "replace" || type == "clear") {
    favIds = new Set();
  }

  switch (type) {
    case "replace":
    case "add":
      ids?.forEach((id) => favIds?.add(id.toString()));
      break;
    case "remove":
      ids?.forEach((id) => favIds?.delete(id.toString()));
      break;
  }

  if (action.save && state.service && favIds) {
    setFavorites(favIds, state.service);
  }

  return { ...state, favIds, service: state.service } as AppState;
}
