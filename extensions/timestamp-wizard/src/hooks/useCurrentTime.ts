import { useState, useEffect, useRef } from "react";
import { ConversionResult } from "../types";
import { generateCurrentTimeItems } from "../utils/formatTime";

/**
 * Manage current time updates and display
 * @returns Current time related states and control functions
 */
export const useCurrentTime = () => {
  const [isShowingCurrentTime, setIsShowingCurrentTime] = useState<boolean>(true);
  const [currentTimeItems, setCurrentTimeItems] = useState<ConversionResult>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Setup current time and timer
  useEffect(() => {
    // Initially display current time
    if (isShowingCurrentTime) {
      setCurrentTimeItems(generateCurrentTimeItems());
    }

    // Clean up previous timer (if exists)
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Only start timer when in current time display mode
    if (isShowingCurrentTime) {
      timerRef.current = setInterval(() => {
        setCurrentTimeItems(generateCurrentTimeItems());
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isShowingCurrentTime]);

  return {
    isShowingCurrentTime,
    setIsShowingCurrentTime,
    currentTimeItems,
  };
};
