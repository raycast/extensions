import type { Cache } from "@raycast/api";
import type { Report } from "./report-data";

/** Best-effort snapshots for immediate display; every command opening revalidates. */
export function createReportCache(storage: Pick<Cache, "get" | "set" | "clear">) {
  return {
    read(key: string): Report | undefined {
      try {
        const value = storage.get(key);
        if (!value) return undefined;
        const report = JSON.parse(value);
        if (
          report?.schemaVersion === 1 &&
          typeof report.generatedAt === "string" &&
          Array.isArray(report.days) &&
          Array.isArray(report.agentDays)
        )
          return report;
      } catch {
        /* Corrupt or unavailable snapshots fall back to the CLI. */
      }
      return undefined;
    },
    write(key: string, report: Report) {
      try {
        storage.set(key, JSON.stringify(report));
      } catch {
        /* A successful report must still display if cache storage fails. */
      }
    },
    clear() {
      try {
        storage.clear();
      } catch {
        /* Refresh still reloads the current report without persistence. */
      }
    },
  };
}
