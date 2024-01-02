import { useCallback, useEffect, useState } from "react";
import Process from "../models/Process";
import { useNamedPorts } from "./useNamedPorts";

export default function useProcesses(): [Process[], () => Promise<void>] {
  const [processes, setProcesses] = useState<Process[]>([]);
  const { getNamedPort } = useNamedPorts();

  const reloadProcesses = useCallback(async () => {
    const processes = await Process.getCurrent();

    processes.forEach((p) => {
      p.portInfo?.forEach((port) => {
        port.name = getNamedPort(port.port)?.name;
      });
    });

    setProcesses(processes);
  }, [setProcesses]);

  useEffect(() => {
    (async () => {
      reloadProcesses();
    })();
  }, []);

  return [processes, reloadProcesses];
}
