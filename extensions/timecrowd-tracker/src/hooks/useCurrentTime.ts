import { useEffect, useState } from "react";
import dayjs from "dayjs";

export const useCurrentTime = () => {
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return currentTime;
};
