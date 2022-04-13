import React from "react";

import { GIF_SERVICE, ServiceName } from "../preferences";
import { set } from "../lib/localGifs";
import { GifIds, StoredGifIds } from "../hooks/useGifPopulator";
export interface AppState {
  favIds?: StoredGifIds;
  recentIds?: StoredGifIds;
}

export type AppStateActionType = "add" | "remove" | "replace" | "clear";

export interface AppStateAction {
  favIds?: StoredGifIds;
  recentIds?: StoredGifIds;

  type: AppStateActionType;
  service?: ServiceName;
  save?: boolean;
}

function createLocalIdsByService(initial = new Map<ServiceName, GifIds>()) {
  return Object.values(GIF_SERVICE).reduce((map, service) => {
    if (service !== GIF_SERVICE.FAVORITES && service !== GIF_SERVICE.RECENTS) {
      map.set(service, new Set());
    }
    return map;
  }, initial);
}

export const initialState: AppState = {
  favIds: createLocalIdsByService(),
  recentIds: createLocalIdsByService(),
};

const AppContext = React.createContext({
  state: initialState,
} as {
  state: AppState;
  dispatch: (action: AppStateAction) => void;
});

export default AppContext;

export function reduceAppState(state: AppState, action: AppStateAction) {
  const { type, favIds, recentIds } = action;

  const service = action.service as ServiceName;

  const favServiceIds = favIds?.get(service);
  if (favServiceIds) {
    switch (type) {
      case "replace":
        state.favIds?.get(service)?.clear();
        favServiceIds.forEach((id) => state.favIds?.get(service)?.add(id));
        break;
      case "add":
        favServiceIds.forEach((id) => {
          state.favIds?.get(service)?.add(id);
          // Remove from recents if present, we don't want the same GIF in both
          state.recentIds?.get(service)?.delete(id);
        });
        break;
      case "remove":
        favServiceIds.forEach((id) => state.favIds?.get(service)?.delete(id));
        break;
    }
  } else if ((favIds && type == "replace") || type == "clear") {
    state.favIds = favIds;
  }

  const recentServiceIds = recentIds?.get(service);
  if (recentServiceIds) {
    switch (type) {
      case "replace":
        state.recentIds?.get(service)?.clear();
        recentServiceIds.forEach(
          (id) => !state.favIds?.get(service)?.has(id) && state.recentIds?.get(service)?.add(id)
        );
        break;
      case "add":
        recentServiceIds.forEach(
          (id) => !state.favIds?.get(service)?.has(id) && state.recentIds?.get(service)?.add(id)
        );
        break;
      case "remove":
        recentServiceIds.forEach((id) => state.recentIds?.get(service)?.delete(id));
        break;
    }
  } else if ((recentIds && type == "replace") || type == "clear") {
    state.recentIds = recentIds;
  }

  const newFavs = state.favIds?.get(service);
  const newRecents = state.recentIds?.get(service);
  if (action.save && service) {
    newFavs && set(newFavs, service, "favs");
    newRecents && set(newRecents, service, "recent");
  }

  return { ...state, favIds: state.favIds, recentIds: state.recentIds } as AppState;
}
