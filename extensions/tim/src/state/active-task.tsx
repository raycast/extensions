import { useCachedState, usePromise } from "@raycast/utils";
import { createContext, useContext, useEffect } from "react";

import { getActiveTask } from "../lib/tim";
import { UUID } from "../types/tim";

const ActiveTaskContext = createContext<[string, (id: UUID) => void]>([
  "",
  () => {
    //
  },
]);

export const ActiveTaskProvider: React.FC<React.PropsWithChildren<object>> = ({ children }) => {
  const [activeTask, setActiveTask] = useCachedState("active-task", "");
  const { data, isLoading } = usePromise(getActiveTask);

  useEffect(() => {
    if (isLoading) return;

    setActiveTask(data ?? "");
  }, [data, isLoading]);

  return <ActiveTaskContext.Provider value={[activeTask, setActiveTask]}>{children}</ActiveTaskContext.Provider>;
};

export const useActiveTask = () => {
  const data = useContext(ActiveTaskContext);
  if (!data) {
    throw new Error("useData without DataProvider in tree");
  }

  return data;
};
