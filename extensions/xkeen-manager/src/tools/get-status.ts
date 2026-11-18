import { loadStartupData } from "../lib/health";
import { parseXkeenStatus } from "../lib/xkeenStatus";

/**
 * Get the current xkeen status, mode, active profile and router health
 * (whether /opt is mounted/writable, free disk space, and xkeen binary
 * availability). Read-only.
 */
export default async function tool() {
  const data = await loadStartupData();
  const status = parseXkeenStatus(data.statusRaw);

  return {
    running: status.isRunning,
    mode: status.mode,
    activeProfile: data.activeProfile,
    health: {
      optMounted: data.optMounted,
      optWritable: data.optWritable,
      optFreeMb: data.optFreeMb,
      xkeenAvailable: data.xkeenAvailable,
    },
    uptime: data.uptime,
  };
}
