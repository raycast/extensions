import { useCallback, useEffect, useState } from "react";
import Process from "../models/Process";
import { Entry, STORAGE_KEY } from "./useKnownProcesses";
import { LocalStorage } from "@raycast/api";
import { ProcessInfo } from "../models/interfaces";

type ExtendedProcess = ProcessInfo & ({ known: true; nickname: string } | { known: false });

export default function useProcesses(): [ExtendedProcess[], () => Promise<void>] {
  const [processes, setProcesses] = useState<ExtendedProcess[]>([]);
  const reloadProcesses = useCallback(async () => {
    const [processes, knownProcesses] = await Promise.all([
      Process.getCurrent(),
      LocalStorage.getItem<string>(STORAGE_KEY).then((value) => (value ? (JSON.parse(value) as Entry[]) : [])),
    ]);
    const extendedProcesses: ExtendedProcess[] = processes.map((process) => {
      const match =
        process.portInfo &&
        knownProcesses.find((entry) => process.portInfo?.some((port) => port.port === Number(entry.port)));
      if (match) {
        return { ...process, known: true, nickname: match.name };
      }
      return { ...process, known: false };
    });
    setProcesses(extendedProcesses);
  }, [setProcesses]);

  useEffect(() => {
    (async () => {
      reloadProcesses();
    })();
  }, []);

  return [processes, reloadProcesses];
}
