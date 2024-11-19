// contexts/FlowContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { FlowContextType } from "../types/index";
import { getFocusLog, getPersonalBest } from "../utils/storage";

const FlowContext = createContext<FlowContextType | undefined>(undefined);

export const FlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [personalBest, setPersonalBest] = useState<number | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const focusLog = await getFocusLog();
    const savedBest = await getPersonalBest();

    if (focusLog) {
      setTotalTime(focusLog.totalTime);
      if (focusLog.lastStart) {
        setIsTracking(true);
      }
    }

    if (savedBest) {
      setPersonalBest(savedBest);
    }
  };

  const startTracking = async () => {
    // Implementation
  };

  const stopTracking = async () => {
    // Implementation
  };

  const resetLogs = async () => {
    // Implementation
  };

  return (
    <FlowContext.Provider
      value={{
        isTracking,
        totalTime,
        personalBest,
        startTracking,
        stopTracking,
        resetLogs,
      }}
    >
      {children}
    </FlowContext.Provider>
  );
};

export const useFlow = () => {
  const context = useContext(FlowContext);
  if (context === undefined) {
    throw new Error("useFlow must be used within a FlowProvider");
  }
  return context;
};
