import { showToast, Toast } from "@raycast/api";
import { useCallback, useState } from "react";
import { processes } from "systeminformation";
import { SortKey } from "./dropdown";
import { ProcessItem } from "../types";

export const useProcessList = (sort: SortKey) => {
  const [processes, setProcesses] = useState<ProcessList>({ processes: [], totalMemory: 0 });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const processes = await fetchProcesses(sort);
      setProcesses(processes);
      return processes;
    } catch (error) {
      console.error("search error", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Could not fetch processes",
        message: String(error),
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [sort]);

  const state = { ...processes, loading };

  return {
    state,
    refresh,
  };
};

type ProcessList = { processes: ProcessItem[]; totalMemory: number };

export const fetchProcesses = async (sort: SortKey): Promise<ProcessList> => {
  const { list } = await processes();
  let totalMemory = 0;

  const sorted = list
    .filter((process) => process.state !== "zombie" && !process.name.startsWith("("))
    .map((process) => {
      totalMemory = Math.max(totalMemory, process.memRss);
      return { ...process, pid: process.pid.toString() };
    })
    .sort((a, b) => {
      const ascending = ["pid", "name"].includes(sort);
      const aValue = sort === "name" ? a.name.toLowerCase() : parseInt(a[sort].toString(), 10);
      const bValue = sort === "name" ? b.name.toLowerCase() : parseInt(b[sort].toString(), 10);
      if (aValue < bValue) return ascending ? -1 : 1;
      if (aValue > bValue) return ascending ? 1 : -1;
      return 0;
    });

  return { processes: sorted, totalMemory };
};
