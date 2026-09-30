// Copied from badge-count-raycast src/lib/dock.ts on 2026-09-30, unchanged except this header and import paths
// Composes the helper run and its interpretation. One call = one Dock read.
import { environment } from "@raycast/api";
import { join } from "node:path";
import type { DockRead } from "./lib/badge/badge";
import { architectureFailure, interpretHelperRun } from "./lib/badge/helper-output";
import { runHelper } from "./lib/badge/run-helper";

export const ACCESSIBILITY_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

export function helperPath(): string {
  return join(environment.assetsPath, "dock-badges");
}

export async function readDock(): Promise<DockRead> {
  const unsupported = architectureFailure(process.arch);
  if (unsupported) return unsupported;
  return interpretHelperRun(await runHelper(helperPath()));
}
