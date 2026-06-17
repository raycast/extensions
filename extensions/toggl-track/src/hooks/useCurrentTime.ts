import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";

interface CurrentTimeHook {
  currentTime: Dayjs;
  setCurrentTime: (time: Dayjs) => void;
}

export function useCurrentTime(): CurrentTimeHook {
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return {
    currentTime,
    setCurrentTime,
  };
}
