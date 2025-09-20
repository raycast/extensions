import { useEffect, useState } from "react";
import { formatTime, incrementDate } from "@src/util";

export type UseNextPuzzleCountdownReturnType = {
  countdown: { hours: string; minutes: string; seconds: string };
  isExpired: boolean;
};

export const useNextPuzzleCountdown = (currentDate: Date): UseNextPuzzleCountdownReturnType => {
  const targetDate = incrementDate(currentDate);
  const midnightTargetDate = targetDate;
  midnightTargetDate.setHours(0, 0, 0, 0);
  const countdownDate = new Date(midnightTargetDate).getTime();

  const [countdown, setCountdown] = useState(countdownDate - new Date().getTime());

  const isExpired = countdown <= 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(countdownDate - new Date().getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownDate]);

  const hours = formatTime(Math.floor((countdown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const minutes = formatTime(Math.floor((countdown % (1000 * 60 * 60)) / (1000 * 60)));
  const seconds = formatTime(Math.floor((countdown % (1000 * 60)) / 1000));

  return { countdown: { hours, minutes, seconds }, isExpired };
};
