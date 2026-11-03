import { useEffect, useRef } from "react";

/**
 * Runs a task once per mounted view, whatever happens to its props. Starting a run costs money and can paste text, so
 * it must not depend on prop identity: Raycast may deliver new but equal props to a running command.
 */
export function useRunOnce(task: () => void): void {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    task();
  }, []);
}
