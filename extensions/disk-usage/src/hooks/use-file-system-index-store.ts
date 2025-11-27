import { useSyncExternalStore } from "react";
import scanStore from "../stores/file-system-index-store";

export const useFileSystemIndexStore = () => {
  return useSyncExternalStore(
    (cb) => scanStore.subscribe(cb),
    () => scanStore.get(),
  );
};
