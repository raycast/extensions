import React from "react";

import { LocalStorage } from "@raycast/api";

import type { ServiceName } from "../preferences";
import type { IGif } from "../models/gif";
import { getKey } from "../lib/favorites";

export interface AppState {
  service?: ServiceName;
  favIds?: Set<string>;
  favItems?: IGif[];
}

export type AppStateActionType = "add" | "remove";

export interface AppStateAction {
  type?: AppStateActionType;
  ids?: Array<string | number>;
  service?: ServiceName;
  save?: boolean;
}

export const initialState: AppState = {
  favIds: new Set<string>(),
  favItems: [],
};

const AppContext = React.createContext({
  state: initialState,
} as {
  state: AppState;
  dispatch: (action: AppStateAction) => void;
});

export default AppContext;

export function reduceAppState(state: AppState, action: AppStateAction) {
  const { favIds } = state;
  const { type, ids } = action;

  if (action.service) {
    state.service = action.service;
  }

  switch (type) {
    case "add":
      ids?.forEach((id) => favIds?.add(id.toString()));
      break;
    case "remove":
      ids?.forEach((id) => favIds?.delete(id.toString()));
      break;
  }

  if (action.save && state.service) {
    LocalStorage.setItem(getKey(state.service), JSON.stringify([...(favIds || [])]));
  }

  return { ...state, favIds, service: state.service } as AppState;
}
