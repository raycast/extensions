import { Application, LocalStorage } from "@raycast/api";
import { IconMetadata } from "../types.ts";

enum Key {
  State = "state",
  Favorites = "favorites",
}

export interface ApplicationState {
  recent?: IconMetadata[];
  activeId?: string;
}

export class Store {
  static async setIcon(app: Application, icon: IconMetadata) {
    const state = await Store.getState();
    const bundleId = app.bundleId!;
    const createdAt = Date.now();

    if (!state[bundleId]) {
      state[bundleId] = {};
    }

    const existingIcon = state[bundleId].recent?.find(
      (i) => i.objectID === icon.objectID,
    );

    if (existingIcon) {
      icon = existingIcon;
    } else {
      if (!state[bundleId].recent) {
        state[bundleId].recent = [];
      }
      state[bundleId].recent.push(icon);
    }

    icon.updatedAt = createdAt;

    state[bundleId].activeId = icon.objectID;
    return LocalStorage.setItem(Key.State, JSON.stringify(state));
  }

  static async unsetIcon(app: Application) {
    const state = await Store.getState();
    const bundleId = app.bundleId!;

    if (state[bundleId]) {
      state[bundleId].activeId = undefined;
      return LocalStorage.setItem(Key.State, JSON.stringify(state));
    }

    return;
  }

  static async getState(): Promise<Record<string, ApplicationState>> {
    const jsonString = await LocalStorage.getItem<Key.State>(Key.State);

    return jsonString ? JSON.parse(jsonString) : {};
  }

  static async getFavorites(): Promise<IconMetadata[]> {
    const jsonString = await LocalStorage.getItem<Key.Favorites>(Key.Favorites);
    return jsonString ? JSON.parse(jsonString) : [];
  }

  static async toggleFavorite(icon: IconMetadata, skipRefresh = false) {
    const favorites = await Store.getFavorites();
    const index = favorites.findIndex((f) => f.objectID === icon.objectID);
    if (index === -1) {
      favorites.push({
        ...icon,
        updatedAt: skipRefresh ? icon.updatedAt : Date.now(),
      });
    } else {
      favorites.splice(index, 1);
    }

    await LocalStorage.setItem(Key.Favorites, JSON.stringify(favorites));

    return favorites;
  }
}
