import { useCallback, useEffect, useState } from "react";
import ProcessInfo from "../models/ProcessInfo";

export default function useProcessInfo(): [ProcessInfo[], () => Promise<void>] {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const reloadProcesses = useCallback(async () => setProcesses(await ProcessInfo.getCurrent()), [setProcesses]);

  useEffect(() => {
    (async () => {
      reloadProcesses();
    })();
  }, []);

  return [processes, reloadProcesses];
}
