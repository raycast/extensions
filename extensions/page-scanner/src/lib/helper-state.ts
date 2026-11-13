/**
 * Where the helper stands, read from `status --json`. No @raycast/api import, so it is tested.
 */
import type { StatusAnswer } from "./cli";

export type HelperState = "missing" | "broken" | "outdated" | "incomplete" | "ready";

/**
 * Where the helper stands. `broken` is a wrapper whose Node is gone, which only a new wrapper
 * fixes; `outdated` is a manifest written before Edge Add-ons had an id (CLI 0.3.1 and earlier),
 * which Edge's store build is refused by until `install` writes it again; `incomplete` is a
 * browser with no manifest beside ones that have it, which can only be one installed since, because
 * `install` writes one for every browser whose data folder is there; `missing` is a machine where
 * nobody has set it up, which is the user's to agree to.
 */
export function helperState(status: StatusAnswer): HelperState {
  const host = status.nativeHost;
  const installed = host.browsers.filter((browser) => browser.installed);
  if (!host.hostInstalled || installed.length === 0) return "missing";
  if (!host.nodeFound) return "broken";
  if (!installed.every((browser) => browser.allowsStore)) return "outdated";
  return installed.length < host.browsers.length ? "incomplete" : "ready";
}

/** The browsers with no manifest of ours, by name: what `incomplete` is about. */
export function browsersWithoutHelper(status: StatusAnswer): string[] {
  return status.nativeHost.browsers.filter((browser) => !browser.installed).map((browser) => browser.name);
}
