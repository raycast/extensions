import { ProcessInfo } from "../Interfaces";
import { getTopProcesses } from "../lib/process-list";

export { getMemoryStats as getMemoryUsage } from "../lib/memory-stats";

export const getTopRamProcess = async (count = 5): Promise<ProcessInfo[]> => {
  return getTopProcesses("memory", count);
};
