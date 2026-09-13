import { useEffect, useState } from "react";

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    function tick() {
      setNow(new Date());
      timeout = setTimeout(tick, intervalMs - (Date.now() % intervalMs));
    }

    timeout = setTimeout(tick, intervalMs - (Date.now() % intervalMs));

    return () => {
      clearTimeout(timeout);
    };
  }, [intervalMs]);

  return now;
}
