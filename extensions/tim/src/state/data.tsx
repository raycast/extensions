import { useCachedPromise } from "@raycast/utils";
import { createContext, useContext } from "react";

import { getData } from "../lib/tim";
import { Data } from "../types/tim";

const DataContext = createContext<{ data?: Data; isLoading: boolean; error?: Error } | undefined>(undefined);

export const DataProvider: React.FC<React.PropsWithChildren<object>> = ({ children }) => {
  const cached = useCachedPromise(getData);

  return <DataContext.Provider value={cached}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const data = useContext(DataContext);
  if (!data) {
    throw new Error("useData without DataProvider in tree");
  }

  return data;
};
