import { useSyncExternalStore } from "react";
import selectionStore from "../stores/selection-store";

export const useSelection = () => {
  useSyncExternalStore(
    (cb) => selectionStore.subscribe(cb),
    () => selectionStore.getSnapshot(),
  );

  return selectionStore;
};
