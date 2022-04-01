import { LocalStorage } from "@raycast/api";
import { useReducer, useState } from "react";

import { AvailableColor } from "../colors/Color";
import { createColor } from "../typeUtilities";

import asyncEffect from "../utilities";

export interface SerializedColor {
  value: string;
  savedAt: number;
}

export interface SavedColor {
  instance: AvailableColor;
  savedAt: number;
}

export interface Storage {
  isLoading: boolean;
  state: {
    collection: SavedColor[];
  };
  clear: () => void;
  add: (color: AvailableColor) => void;
  remove: (color: AvailableColor) => void;
  empty: () => boolean;
}

interface InitialState {
  collection: SavedColor[] | [];
}

enum StorageActions {
  Add = "add",
  Remove = "remove",
  Update = "update",
  Clear = "clear"
}

type StorageKeys = "history" | "favorites";

export type StorageAction =
  | { type: StorageActions.Add; value: AvailableColor; key: StorageKeys }
  | { type: StorageActions.Remove; value: AvailableColor; key: StorageKeys }
  | { type: StorageActions.Update; items: SavedColor[]; key: StorageKeys }
  | { type: StorageActions.Clear; key: StorageKeys };

export const storageInitialState = {
  collection: []
};

const queue = new Set<Promise<void>>();

function queueAdd(callback: () => Promise<void>) {
  const engine = async () => {
    await Promise.all(queue);
    await callback();
  };
  queue.add(engine());
}

async function rawList(key: string): Promise<SerializedColor[]> {
  return JSON.parse((await LocalStorage.getItem(key)) || "[]");
}

async function items(key: string): Promise<SavedColor[]> {
  const items = await rawList(key);

  return items.map((color: SerializedColor) => ({ instance: createColor(color.value), savedAt: color.savedAt }));
}

async function update(key: string, items: SavedColor[]) {
  queueAdd(async () => {
    const newLocal = JSON.stringify(
      items.map((color) => ({ value: color.instance.stringValue(), savedAt: color.savedAt }))
    );
    await LocalStorage.setItem(key, newLocal);
  });
}

function storageReducer(state: InitialState, action: StorageAction) {
  let newState = state;

  switch (action.type) {
    case StorageActions.Clear:
      newState = { collection: [] };

      break;
    case StorageActions.Update:
      return { collection: action.items };
    case StorageActions.Remove:
      newState = {
        collection: state.collection.filter(({ instance }) => instance.stringValue() !== action.value.stringValue())
      };

      break;
    case StorageActions.Add:
      if (state.collection.length !== 0) {
        if (state.collection[0].instance.stringValue() === action.value.stringValue()) {
          break;
        }

        newState = { collection: [{ instance: action.value, savedAt: Date.now() }, ...state.collection] };

        break;
      }

      newState = { collection: [{ instance: action.value, savedAt: Date.now() }] };

      break;
    default:
      throw Error("Unknown action");
  }

  update(action.key, newState.collection);

  return newState;
}

export function useColorStorage(key: StorageKeys, initialCallback?: (state: SavedColor[]) => void): Storage {
  const [state, dispatch] = useReducer(storageReducer, storageInitialState);
  const [isLoading, setIsLoading] = useState(true);

  asyncEffect(items(key), (state) => {
    dispatch({ type: StorageActions.Update, key, items: state });
    setIsLoading(false);

    if (initialCallback) {
      initialCallback(state);
    }
  });

  return {
    isLoading,
    state,
    clear: () => {
      dispatch({ type: StorageActions.Clear, key });
      if (initialCallback) {
        initialCallback([]);
      }
    },
    add: (color: AvailableColor) => dispatch({ type: StorageActions.Add, value: color, key }),
    remove: (color: AvailableColor) => dispatch({ type: StorageActions.Remove, value: color, key }),
    empty: () => state.collection.length === 0
  };
}
