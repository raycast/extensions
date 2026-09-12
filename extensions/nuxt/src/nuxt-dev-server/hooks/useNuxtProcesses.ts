/**
 * Custom hook to detect and monitor Nuxt development servers
 */

import { useExec } from "@raycast/utils";
import { useMemo, useEffect, useState, useRef } from "react";
import { PORT_RANGE, SHELL_COMMANDS } from "../constants/config";
import { parseNuxtProcesses, collectProcessDetails } from "../utils/process";
import type { NuxtProcess, ProcessDetails } from "../utils/process";

/**
 * Hook to detect and monitor Nuxt processes
 * Returns list of processes with cached details to prevent flickering
 */
export function useNuxtProcesses() {
  const [processDetails, setProcessDetails] = useState<Map<string, ProcessDetails>>(new Map());
  const prevPidsRef = useRef<string>("");

  // Check for Node processes listening on common Nuxt ports
  const {
    data: lsofData,
    isLoading: lsofLoading,
    revalidate: lsofRevalidate,
  } = useExec("sh", ["-c", SHELL_COMMANDS.FIND_LISTENING_PORTS(PORT_RANGE.MIN, PORT_RANGE.MAX)]);

  // Also check for nuxt/nuxi processes
  const { data: psData } = useExec("sh", ["-c", SHELL_COMMANDS.FIND_NUXT_PROCESSES]);

  // Parse and identify Nuxt processes
  const nuxtProcesses = useMemo(() => {
    return parseNuxtProcesses(lsofData || "", psData);
  }, [lsofData, psData]);

  // Fetch project info for new processes (cached to prevent flickering)
  useEffect(() => {
    const currentPids = nuxtProcesses.map((p) => p.pid).join(",");

    // Only update if PIDs actually changed
    if (currentPids === prevPidsRef.current) {
      return;
    }

    prevPidsRef.current = currentPids;

    if (nuxtProcesses.length === 0) {
      if (processDetails.size > 0) {
        setProcessDetails(new Map());
      }
      return;
    }

    const activePids = new Set(nuxtProcesses.map((p) => p.pid));
    let needsUpdate = false;

    // Check if we need to update (new processes or removed processes)
    for (const process of nuxtProcesses) {
      if (!processDetails.has(process.pid)) {
        needsUpdate = true;
        break;
      }
    }

    for (const pid of processDetails.keys()) {
      if (!activePids.has(pid)) {
        needsUpdate = true;
        break;
      }
    }

    if (!needsUpdate) return;

    const newDetails = new Map<string, ProcessDetails>();

    // Keep existing details for active processes
    for (const [pid, details] of processDetails.entries()) {
      if (activePids.has(pid)) {
        newDetails.set(pid, details);
      }
    }

    // Fetch info for new processes only
    for (const process of nuxtProcesses) {
      if (!newDetails.has(process.pid)) {
        const info = collectProcessDetails(process.pid, process.command);
        newDetails.set(process.pid, info);
      }
    }

    setProcessDetails(newDetails);
  }, [nuxtProcesses]);

  return {
    processes: nuxtProcesses,
    processDetails,
    isLoading: lsofLoading,
    revalidate: lsofRevalidate,
  };
}

/**
 * Merge process with its cached details
 */
export function mergeProcessWithDetails(process: NuxtProcess, details: ProcessDetails | undefined): NuxtProcess {
  if (!details) return process;

  return {
    ...process,
    ...details,
  };
}

/**
 * Get unique ports from process list
 */
export function getUniquePorts(processes: NuxtProcess[]): string[] {
  const uniquePorts = new Set(processes.map((p) => p.port));
  return Array.from(uniquePorts);
}
