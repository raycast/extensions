import { useCallback, useEffect, useState } from "react";
import Process from "../models/Process";

export default function useProcesses(): [Process[], () => Promise<void>] {
  const [processes, setProcesses] = useState<Process[]>([]);
  const reloadProcesses = useCallback(async () => {
    const processes = await Process.getCurrent();
    setProcesses(processes);
  }, [setProcesses]);

  useEffect(() => {
    (async () => {
      reloadProcesses();
    })();
  }, []);

  return [processes, reloadProcesses];
}
