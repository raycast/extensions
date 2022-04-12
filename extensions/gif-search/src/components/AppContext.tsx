import React from "react";

import { GIF_SERVICE, ServiceName } from "../preferences";
import { setFavorites } from "../lib/favorites";

export interface AppState {
  favIds?: Map<ServiceName, Set<string>>;
}

export type AppStateActionType = "add" | "remove" | "replace" | "clear";

export interface AppStateAction {
  type?: AppStateActionType;
  ids?: Map<ServiceName, Set<string>>;
  service?: ServiceName;
  save?: boolean;
}

export const initialState: AppState = {
  favIds: Object.values(GIF_SERVICE).reduce((map, service) => {
    if (service !== GIF_SERVICE.FAVORITES) {
      map.set(service, new Set());
    }
    return map;
  }, new Map<ServiceName, Set<string>>()),
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

  const service = action.service as ServiceName;

  if (type == "replace" || type == "clear") {
    if (service === GIF_SERVICE.FAVORITES) {
      favIds = ids;
    }
  }

  const serviceIds = ids?.get(service);
  if (serviceIds) {
    switch (type) {
      case "replace":
        favIds?.get(service)?.clear();
        serviceIds.forEach((id) => favIds?.get(service)?.add(id));
        break;
      case "add":
        serviceIds.forEach((id) => favIds?.get(service)?.add(id));
        break;
      case "remove":
        serviceIds.forEach((id) => favIds?.get(service)?.delete(id));
        break;
    }
  }

  const newFavs = favIds?.get(service);
  if (action.save && service && newFavs) {
    setFavorites(newFavs, service);
  }

  return { ...state, favIds } as AppState;
}
