import { clearLocalState } from "./cache";
import { useAPM } from "./apm";
import { useDashboards } from "./dashboards";
import { useMonitors } from "./monitors";
import { useNotebooks } from "./notebooks";

enum Caches {
  Apm = "apm",
  Dashboards = "dashboards",
  Monitors = "monitors",
  Notebooks = "notebooks",
}

export { clearLocalState, useAPM, useDashboards, useMonitors, useNotebooks, Caches };
