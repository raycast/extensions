// Development mode context for consistent state management
import { createContext, useContext, useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";

interface DevelopmentContextType {
  isDevelopment: boolean;
}

const DevelopmentContext = createContext<DevelopmentContextType | undefined>(undefined);

interface DevelopmentProviderProps {
  children: React.ReactNode;
}

export function DevelopmentProvider({ children }: DevelopmentProviderProps) {
  const value = useMemo(() => {
    try {
      const preferences = getPreferenceValues<Preferences>();
      return {
        isDevelopment: preferences.useMockData || false,
      };
    } catch {
      // Fallback to environment variable if preferences can't be read
      return {
        isDevelopment: process.env.NODE_ENV === "development",
      };
    }
  }, []);

  return <DevelopmentContext.Provider value={value}>{children}</DevelopmentContext.Provider>;
}

export function useDevelopmentMode(): boolean {
  const context = useContext(DevelopmentContext);

  if (context === undefined) {
    throw new Error("useDevelopmentMode must be used within a DevelopmentProvider");
  }

  return context.isDevelopment;
}
