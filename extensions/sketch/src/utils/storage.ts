import { allLocalStorageItems } from "@raycast/api";
import { StorageItems } from "../types/preferences";

export const getSelectedWorkspace = async () => {
  const { selectedWorkspace }: StorageItems = await allLocalStorageItems();
  if (!selectedWorkspace) throw new Error();
  return JSON.parse(selectedWorkspace);
};
