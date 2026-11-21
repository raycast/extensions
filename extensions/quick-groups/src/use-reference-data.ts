import { watch } from "node:fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadReferenceDirectory } from "./loader";
import { initializeDefaultGroupsDirectory } from "./groups-directory";
import { Diagnostic, ReferenceRecord } from "./model";

export function useReferenceData(referenceDirectory: string, initializeDefault = false) {
  const [records, setRecords] = useState<ReferenceRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadVersion = useRef(0);

  const reload = useCallback(
    async (showLoading = true) => {
      const version = ++loadVersion.current;
      if (showLoading) setIsLoading(true);
      const result = await loadReferenceDirectory(referenceDirectory);
      if (version !== loadVersion.current) return;
      setRecords(result.records);
      setDiagnostics(result.diagnostics);
      setIsLoading(false);
    },
    [referenceDirectory],
  );

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout | undefined;
    let watcher: ReturnType<typeof watch> | undefined;

    async function start() {
      try {
        if (initializeDefault) await initializeDefaultGroupsDirectory(referenceDirectory);
      } catch {
        // The loader below will turn an unavailable directory into a visible diagnostic.
      }
      if (!active) return;
      await reload();
      if (!active) return;
      try {
        watcher = watch(referenceDirectory, { recursive: true }, () => {
          clearTimeout(timer);
          timer = setTimeout(() => void reload(false), 150);
        });
      } catch {
        // Loading already surfaces unreadable-directory errors; live refresh is an optional enhancement.
      }
    }

    void start();
    return () => {
      active = false;
      loadVersion.current += 1;
      clearTimeout(timer);
      watcher?.close();
    };
  }, [initializeDefault, referenceDirectory, reload]);

  return { records, diagnostics, isLoading, reload };
}
