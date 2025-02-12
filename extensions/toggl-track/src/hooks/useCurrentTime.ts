import dayjs from "dayjs";
import { useEffect, useState } from "react";

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(dayjs());
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);
  return currentTime;
}
