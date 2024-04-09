import { useEffect } from "react";

export function useAsyncEffect(fn: () => Promise<void>, deps: React.DependencyList) {
  return useEffect(() => {
    fn();
  }, deps);
}
