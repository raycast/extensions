import { LocalStorage } from "@raycast/api";
import { useEffect } from "react";
import SuperJSON from "superjson";
import { State } from "../types";

export function useLoadState(options: { defaultValue: State; onStateLoaded: (state: State) => void }) {
  const { defaultValue, onStateLoaded } = options;

  useEffect(() => {
    (async function () {
      onStateLoaded(await readStateFromLocalStorage(defaultValue));
    })();
  }, []);
}

export function useSaveState(state: State) {
  useEffect(() => {
    if (state.type === "loading-state") return;
    writeStateToLocalStorage(state);
  }, [state]);
}

function writeStateToLocalStorage(state: State) {
  const serializedState = SuperJSON.stringify(state);
  LocalStorage.setItem("state", serializedState);
}

async function readStateFromLocalStorage(defaultValue: State): Promise<State> {
  const serializedState = await LocalStorage.getItem<string>("state");

  if (typeof serializedState === "undefined") {
    return defaultValue;
  }

  return SuperJSON.parse<State>(serializedState);
}
