import { getPreferenceValues } from "@raycast/api";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

export type ShowDetailsContextType = {
  value: boolean;
  setValue: (value: boolean) => void;
  on: () => void;
  off: () => void;
  toggle: () => void;
};

export const ShowDetailsContext = createContext<ShowDetailsContextType | undefined>(undefined);

export function ShowDetailsProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const preferences = getPreferenceValues<Preferences>();
  const [showDetails, setShowDetails] = useState(preferences.showDetails);

  const contextValue = useMemo<ShowDetailsContextType>(() => {
    return {
      value: showDetails,
      on: () => {
        setShowDetails(true);
      },
      off: () => {
        setShowDetails(false);
      },
      toggle: () => {
        setShowDetails((previous) => !previous);
      },
      setValue: (value) => {
        setShowDetails(value);
      },
    };
  }, [showDetails, setShowDetails]);

  return <ShowDetailsContext.Provider value={contextValue}>{children}</ShowDetailsContext.Provider>;
}

export function useShowDetails() {
  const context = useContext(ShowDetailsContext);

  if (context === undefined) {
    throw new Error("useShowDetails must be used within a ShowDetailsProvider");
  }

  return context;
}
