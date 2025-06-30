import { getPreferenceValues } from "@raycast/api";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

export type LeagueContextType = {
  value: Preferences["league"];
  setValue: (value: string) => void;
  useLastValue: Preferences["useLastValue"];
};

export const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const preferences = getPreferenceValues<Preferences>();
  const [league, setLeague] = useState(preferences.league);

  const contextValue = useMemo<LeagueContextType>(() => {
    return {
      value: league,
      setValue: (value: string) => {
        setLeague(value as Preferences["league"]);
      },
      useLastValue: preferences.useLastValue,
    };
  }, [league, setLeague]);

  return <LeagueContext.Provider value={contextValue}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  const context = useContext(LeagueContext);

  if (context === undefined) {
    throw new Error("useLeague must be used within a LeagueProvider");
  }

  return context;
}
