import React, { useEffect, useState } from "react";
import { getStorage, StorageValues } from "../storage";
import useCurrentTime from "../hooks/useCurrentTime";
import { generateProjectGroups, ProjectGroup } from "./ProjectGroup";
import { LocalStorage, showToast, Toast } from "@raycast/api";

interface AppContextProps extends StorageValues {
  projectGroups: ProjectGroup[];
  isLoading: boolean;
  isValidToken: boolean;
}

const initialStorageValues: StorageValues = Object.freeze({
  clients: [],
  projects: [],
  tags: [],
  workspaces: [],
  timeEntries: [],
  runningTimeEntry: null,
});

const AppContext = React.createContext<AppContextProps>({
  ...initialStorageValues,
  projectGroups: [],
  isLoading: true,
  isValidToken: true,
});

export const AppContextProvider = ({ children }: { children: JSX.Element }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadedStorage, setLoadedStorage] = useState<StorageValues>(initialStorageValues);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [isValidToken, setIsValidToken] = useState(true);
  const currentTime = useCurrentTime();

  useEffect(() => {
    const load = async () => {
      try {
        const storage = await getStorage();
        setLoadedStorage(storage);
        const projectGroups = generateProjectGroups(storage.projects, storage.workspaces, storage.clients);
        setProjectGroups(projectGroups);
      } catch (e: any) {
        if (e.message.includes("403")) {
          LocalStorage.clear();
          setIsValidToken(false);
        }
        showToast(Toast.Style.Failure, "Failed to load data from Toggl. Please try again.");
      }

      setIsLoading(false);
    };
    load();
  }, [currentTime]);

  return (
    <AppContext.Provider
      value={{
        isLoading,
        ...loadedStorage,
        projectGroups,
        isValidToken,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  return React.useContext(AppContext);
};
