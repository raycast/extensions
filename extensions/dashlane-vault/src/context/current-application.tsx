import { Application, getFrontmostApplication } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { createContext, useContext } from "react";

export type CurrentApplicationContextType = {
  currentApplication?: Application;
  isLoading: boolean;
};

const CurrentApplicationContext = createContext<CurrentApplicationContextType | undefined>(undefined);

export function CurrentApplicationProvider({ children }: { children: React.ReactNode }) {
  const { data: currentApplication, isLoading } = usePromise(getFrontmostApplication);

  return (
    <CurrentApplicationContext.Provider value={{ currentApplication, isLoading }}>
      {children}
    </CurrentApplicationContext.Provider>
  );
}

export function useCurrentApplicationContext() {
  const context = useContext(CurrentApplicationContext);
  if (context === undefined) {
    throw new Error("useCurrentApplicationContext must be used within a CurrentApplicationProvider");
  }
  return context;
}
