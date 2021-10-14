import { allLocalStorageItems } from "@raycast/api";
import { StorageItems } from "../types/preferences";

export const getSelectedWorkspace = async () => {
  const { selectedWorkspace }: StorageItems = await allLocalStorageItems();
  if (!selectedWorkspace) return undefined;
  return JSON.parse(selectedWorkspace);
};

export const getCachedData = async () => {
  const { cachedData }: StorageItems = await allLocalStorageItems();
  if (!cachedData) return undefined;
  return JSON.parse(cachedData);
};

export const getAllWorkspaces = async () => {
  const { allWorkspaces }: StorageItems = await allLocalStorageItems();
  if (!allWorkspaces) return undefined;
  return JSON.parse(allWorkspaces);
};
