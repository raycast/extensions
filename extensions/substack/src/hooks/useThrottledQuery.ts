import { useThrottle } from "ahooks";
import { useState } from "react";

export default function useThrottledQuery(): [string, (query: string) => void, boolean] {
  const [query, setQuery] = useState<string>("");
  // We throttle the query to avoid making too many requests (this is more configurable compared to the 'normal' Raycast throttle)
  const throttledQuery = useThrottle(query, { wait: 1000 });
  const unEqual = throttledQuery !== query;

  return [throttledQuery, setQuery, unEqual];
}
