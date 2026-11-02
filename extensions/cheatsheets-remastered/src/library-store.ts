import { LocalStorage, environment } from "@raycast/api";
import { LibraryStore } from "./storage";
import { createStorageLock } from "./storage-lock";

export const withStorageLock = createStorageLock(environment.supportPath);
export const libraryStore = new LibraryStore(LocalStorage, withStorageLock);
