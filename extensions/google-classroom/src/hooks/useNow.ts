import { useEffect, useState } from "react";

// Statuses and relative dates depend on the time, which moves on while a view stays open
export function useNow(interval = 60_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}
