import React, { createContext, useContext, useEffect, useState } from "react";
import { LocalStorage, showToast, ToastStyle } from "@raycast/api";
import initialActions, { Action } from "../constants/initialActions";
import Values = LocalStorage.Values;

type ConfigContextType = {
  actions: Action[];
  addAction: (action: Action) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
  fetchActions: () => Promise<void>;
};

export const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      const items = await LocalStorage.allItems<Values>();
      const storedActions = Object.values(items).map((item) => JSON.parse(item)) as Action[];

      if (storedActions.length === 0) {
        // Initialize with default actions if no actions are found
        for (const action of initialActions) {
          await LocalStorage.setItem(action.id, JSON.stringify(action));
        }
        setActions(initialActions);
      } else {
        setActions(storedActions);
      }
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to fetch actions");
      console.error(error);
    }
  };

  const addAction = async (action: Action) => {
    try {
      await LocalStorage.setItem(action.id, JSON.stringify(action));
      setActions((prevActions) => [...prevActions, action]);
      showToast(ToastStyle.Success, "Action added");
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to add action");
      console.error(error);
    }
  };

  const deleteAction = async (id: string) => {
    try {
      await LocalStorage.removeItem(id);
      setActions((prevActions) => prevActions.filter((action) => action.id !== id));
      showToast(ToastStyle.Success, "Action deleted");
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to delete action");
      console.error(error);
    }
  };

  return (
    <ConfigContext.Provider value={{ actions, addAction, deleteAction, fetchActions }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
};
