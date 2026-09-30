import { useState, useEffect } from "react";
import { enableTimeSeconds, enableTimeFormat } from "u/options";

export default function useTime() {
  const [time, setTime] = useState(`00:00${enableTimeSeconds ? ":00" : ""} ${enableTimeFormat ? "AM" : ""}`);

  useEffect(() => {
    const intervalTime = enableTimeSeconds ? 1000 : 60000; // 1000 ms = 1 second, 60000 ms = 1 minute
    const intervalId = setInterval(() => {
      const now = new Date();
      const timeOptions = {
        hour: "numeric" as const,
        minute: "numeric" as const,
        second: enableTimeSeconds ? ("numeric" as const) : undefined,
        hour12: enableTimeFormat,
      };
      let timeStr = now.toLocaleTimeString("en-US", timeOptions);
      if (enableTimeFormat) {
        const parts = timeStr.split(" ");
        parts[1] = parts[1].toUpperCase();
        timeStr = parts.join(" ");
      }
      setTime(timeStr);
    }, intervalTime);

    return () => clearInterval(intervalId);
  }, []);

  return time;
}
