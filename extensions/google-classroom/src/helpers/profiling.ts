import { environment } from "@raycast/api";
import { useEffect } from "react";

const renders = new Map<string, { cpuMs: number; rows: number }>();
const ready = new Map<string, number>();
export function markDataReady(label: string) {
  if (environment.isDevelopment) {
    renders.set(label, { cpuMs: 0, rows: 0 });
    ready.set(label, performance.now());
  }
}
export function recordRender<T>(label: string, started: number, element: T): T {
  if (environment.isDevelopment) {
    const total = renders.get(label) ?? { cpuMs: 0, rows: 0 };
    total.cpuMs += performance.now() - started;
    total.rows++;
    renders.set(label, total);
  }
  return element;
}
// React commit is observable here; macOS paint/compositing is not included.
export function useRenderReport(label: string, data: unknown) {
  useEffect(() => {
    if (!environment.isDevelopment || data === undefined || !ready.has(label)) return;
    const total = renders.get(label);
    console.log(
      "[Classroom timing] " +
        JSON.stringify({
          phase: "react-commit",
          view: label,
          dataToCommitMs: performance.now() - ready.get(label)!,
          rowBuildMs: total?.cpuMs ?? 0,
          rowsBuilt: total?.rows ?? 0,
        }),
    );
    ready.delete(label);
    renders.delete(label);
  }, [label, data]);
}
