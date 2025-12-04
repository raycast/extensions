import { DataManager } from "@managers";

import { useContext } from "react";

import { ApplicationContext } from "@providers";

import { Filter } from "@types";

type UseDataManager = () => {
  dataManager: DataManager;
  filter: Filter;
  commandIdentifier: string;
  setFilter: (filter: Filter) => void;
  setCommandToRefresh: (identifier: string) => void;
};

export const useDataManager: UseDataManager = () => {
  const { state, setFilter, setCommandToRefresh } = useContext(ApplicationContext);

  return {
    dataManager: state.dataManager,
    filter: state.filter,
    commandIdentifier: state.commandIdentifier,
    setFilter,
    setCommandToRefresh,
  };
};
