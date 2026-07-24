import { existsSync, promises } from "fs";
import { validateAppIsInstalled } from "../actions";
import { SearchResult, Workspace, WorkspaceCache } from "../types/interfaces";
import { geNotInstalledMessage, getNoWorkspacesMessage } from "../utils/messageUtils";
import { getWorkspacesCachePath } from "../utils/pathUtils";
import { useCallback, useEffect, useState } from "react";
import { NotInstalledError, NoWorkspacesError, UnknownError } from "../components";

const getWorkspaces = async (profile?: string): Promise<Workspace[]> => {
  // First check if the app is installed
  await validateAppIsInstalled();

  const workspaceCacheFilePath = getWorkspacesCachePath(profile);
  if (!existsSync(workspaceCacheFilePath)) {
    throw new Error(getNoWorkspacesMessage());
  }

  const fileBuffer = await promises.readFile(workspaceCacheFilePath, { encoding: "utf-8" });

  const cache = JSON.parse(fileBuffer) as WorkspaceCache;

  return cache.workspaces;
};

export function useWorkspaceSearch(): SearchResult<Workspace> {
  const [data, setData] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<string>();
  const [errorView, setErrorView] = useState<React.ReactNode>();

  const revalidate = useCallback(
    (profileId: string) => {
      setProfile(profileId);
    },
    [profile],
  );

  useEffect(() => {
    getWorkspaces(profile)
      .then((workspaces) => {
        setData(workspaces);
        setIsLoading(false);
      })
      .catch((e) => {
        if (e.message === geNotInstalledMessage()) {
          setErrorView(<NotInstalledError />);
        } else if (e.message === getNoWorkspacesMessage()) {
          setErrorView(<NoWorkspacesError />);
        } else {
          setErrorView(<UnknownError />);
        }
        setIsLoading(false);
      });
  }, [profile]);

  return {
    data,
    isLoading,
    errorView,
    revalidate,
  };
}
