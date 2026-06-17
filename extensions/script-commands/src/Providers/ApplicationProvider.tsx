import { createContext, useState, ReactNode } from "react";

import { DataManager } from "@managers";

import { Filter } from "@types";

import { Toast } from "@raycast/api";

import { FilterToast } from "@components";

type ProviderState = {
  dataManager: DataManager;
  filter: Filter;
  commandIdentifier: string;
};

type ContextType = {
  state: ProviderState;
  setFilter: (filter: Filter) => void;
  setCommandToRefresh: (identifier: string) => void;
};

const initialState: ProviderState = {
  dataManager: DataManager.shared(),
  filter: null,
  commandIdentifier: "",
};

export const ApplicationContext = createContext<ContextType>({
  state: initialState,
  setFilter: () => {
    return;
  },
  setCommandToRefresh: () => {
    return;
  },
});

type Props = {
  children: ReactNode;
};

export const ApplicationProvider = ({ children }: Props) => {
  let toast: Toast | null;
  const [state] = useState<ProviderState>(initialState);
  const [filter, setCustomFilter] = useState<Filter>(null);
  const [commandIdentifier, setCommandToRefresh] = useState<string>("");

  const setFilter = async (filter: Filter) => {
    setCustomFilter(filter);

    if (filter != null) {
      toast = await FilterToast(filter);
    } else if (toast) {
      toast.hide();
    }
  };

  return (
    <ApplicationContext.Provider
      value={{
        state: {
          dataManager: state.dataManager,
          filter,
          commandIdentifier,
        },
        setFilter,
        setCommandToRefresh,
      }}
      children={children}
    />
  );
};
