import { getLocalStorageItem } from "@raycast/api";

export const getSelectedWorkspace = async () => {
  const selectedWorkspace: string | undefined = await getLocalStorageItem("selectedWorkspace");
  if (!selectedWorkspace) return undefined;
  return JSON.parse(selectedWorkspace);
};

export const getCachedData = async () => {
  const cachedData: string | undefined = await getLocalStorageItem("cachedData");
  if (!cachedData) return undefined;
  return JSON.parse(cachedData);
};

export const getAllWorkspaces = async () => {
  const allWorkspaces: string | undefined = await getLocalStorageItem("allWorkspaces");
  if (!allWorkspaces) return undefined;
  return JSON.parse(allWorkspaces);
};

export const getLastUsedEmail = async () => {
  const lastUsedEmail: string | undefined = await getLocalStorageItem("lastUsedEmail");
  if (!lastUsedEmail) return undefined;
  return lastUsedEmail;
};

export const getCachedProjects = async () => {
  const cachedProjects: string | undefined = await getLocalStorageItem("cachedProjects");
  if (!cachedProjects) return undefined;
  return JSON.parse(cachedProjects);
};
