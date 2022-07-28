import { createContext, FC, ReactNode, useContext } from "react";

type ProcessListContext = {
  showDetail: boolean;
  toggleDetail: () => void;
  refresh: () => void;
  totalMemory: number;
};

const ProcessListContext = createContext<ProcessListContext>({} as ProcessListContext);

export const useProcessListContext = () => {
  return useContext(ProcessListContext);
};

type ProcessListProviderProps = {
  children: ReactNode;
  showDetail: boolean;
  setShowingDetail: (showDetail: boolean) => void;
  totalMemory: number;
  refresh: () => void;
};
export const ProcessListProvider: FC<ProcessListProviderProps> = ({
  showDetail,
  setShowingDetail,
  refresh,
  totalMemory,
  children,
}) => {
  const toggleDetail = () => setShowingDetail(!showDetail);
  return (
    <ProcessListContext.Provider value={{ totalMemory, showDetail, toggleDetail, refresh }}>
      {children}
    </ProcessListContext.Provider>
  );
};
