import { getFrontmostApplication } from "@raycast/api";
import { windowsProcessName } from "../app-matching";
import { captureWindowsTarget } from "./windows-target";
import { windowsBrowsers, type ExecutionTarget } from "./execution-target";

export async function getWindowsFrontmostBrowserTarget(): Promise<ExecutionTarget | null> {
  const native = await getFrontmostApplication();
  const processName = windowsProcessName(native);
  if (!processName || !windowsBrowsers.includes(processName.toLowerCase())) return null;
  return captureWindowsTarget(processName, true);
}
export async function getWindowsFrontmostHostname(): Promise<string | null> {
  const target = await getWindowsFrontmostBrowserTarget();
  return target?.kind === "browser" ? target.hostname : null;
}
