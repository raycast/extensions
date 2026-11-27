/**
 * Helpers shared by the Memory view and the dashboard's memory cards.
 */
import { SystemSnapshot } from "../data/types";
import { formatBytes } from "./formatting";

/** One segment of a stacked bar. */
export interface BarSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * Memory composition in Activity Monitor's categories: App Memory, Wired,
 * Compressed, Cached Files and Free. Cached Files is reclaimable and is the
 * number people wrongly panic about, so it sits right before Free.
 */
export function memorySlices(snapshot: SystemSnapshot): BarSlice[] {
  return [
    { label: "App Memory", value: snapshot.appMemory, color: "#0A84FF" },
    { label: "Wired", value: snapshot.wiredRam, color: "#FF375F" },
    { label: "Compressed", value: snapshot.compressedRam, color: "#FF9F0A" },
    { label: "Cached Files", value: snapshot.cachedFiles, color: "#5E5CE6" },
    { label: "Free", value: snapshot.freeRam, color: "#30D158" },
  ];
}

/** Header text for the composition bar: installed RAM, plus swap when any is in use. */
export function memorySubtitle(snapshot: SystemSnapshot): string {
  const total = "Total " + formatBytes(snapshot.totalRam);
  if (snapshot.swapUsed > 0) {
    return total + " · Swap " + formatBytes(snapshot.swapUsed);
  }
  return total;
}

/** Chart color for memory pressure, using the app's own bands: 34 and 67 percent. */
export function pressureColor(percent: number): string {
  if (percent >= 67) {
    return "#FF453A";
  }
  if (percent >= 34) {
    return "#FF9F0A";
  }
  return "#0A84FF";
}
