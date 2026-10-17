import { Alert, confirmAlert, open, showHUD, showToast, Toast } from "@raycast/api";
import { BUY_URL, ProLicenseError } from "./license";
import { getHealth, SiteHealth } from "./bricks-data";
import { helperRequest, SCAN_TIMEOUT } from "./design";
import { loadSelectedSite, Site } from "./sites";

const MIN_VERSION = "1.4.0";

export type MaintenanceMode = SiteHealth["maintenance_mode"];
export type Tool = "regenerate-css" | "clear-cache" | "regenerate-signatures";

export const MODE_LABELS: Record<MaintenanceMode, string> = {
  "": "Off",
  maintenance: "Maintenance",
  comingSoon: "Coming soon",
};

/** Sets maintenance mode after asking: visitors see the maintenance page (or the site again) right away. */
export async function setMaintenanceMode(site: Site, mode: MaintenanceMode): Promise<string | undefined> {
  const confirmed = await confirmAlert({
    title: mode
      ? `Turn on ${MODE_LABELS[mode].toLowerCase()} mode on ${site.name}?`
      : `Turn off maintenance mode on ${site.name}?`,
    message: mode
      ? "Visitors who aren't signed in see Bricks' maintenance page until you turn it off."
      : "The site is public again for everyone.",
    primaryAction: {
      title: mode ? "Turn On" : "Turn Off",
      style: mode ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
    },
  });
  if (!confirmed) return undefined;
  const result = await helperRequest<{ mode: MaintenanceMode }>(
    site,
    "/tools/maintenance",
    {},
    { method: "POST", body: { mode }, minVersion: MIN_VERSION },
  );
  return result.mode ? `${MODE_LABELS[result.mode]} mode is on for ${site.name}` : `${site.name} is live again`;
}

/** Turns maintenance mode off when it's on, or on (maintenance) when it's off. */
export async function toggleMaintenanceMode(site: Site): Promise<string | undefined> {
  const health = await getHealth(site);
  return setMaintenanceMode(site, health.maintenance_mode ? "" : "maintenance");
}

/** Runs a tool; returns what to tell the user, or undefined when they canceled. */
export async function runTool(site: Site, tool: Tool): Promise<string | undefined> {
  if (tool === "regenerate-signatures") {
    const confirmed = await confirmAlert({
      title: `Regenerate code signatures on ${site.name}?`,
      message:
        "Every Code element, SVG and query editor gets signed again, so Bricks runs all of it, including code someone else added. Only do this if you trust all the code on the site.",
      primaryAction: { title: "Regenerate", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return undefined;
    const result = await helperRequest<{ success: boolean }>(
      site,
      "/tools/regenerate-signatures",
      {},
      { method: "POST", minVersion: MIN_VERSION, timeout: SCAN_TIMEOUT },
    );
    if (!result.success) throw new Error(`Couldn't regenerate code signatures on ${site.name}`);
    return `Code signatures regenerated on ${site.name}`;
  }
  if (tool === "regenerate-css") {
    const result = await helperRequest<{ files: number; css_loading: string }>(
      site,
      "/tools/regenerate-css",
      {},
      { method: "POST", minVersion: MIN_VERSION, timeout: SCAN_TIMEOUT },
    );
    return result.css_loading === "file"
      ? `Regenerated ${result.files} CSS files on ${site.name}`
      : `Regenerated ${result.files} CSS files on ${site.name} (CSS loading is inline, so they aren't used)`;
  }
  const result = await helperRequest<{ cleared: string[] }>(
    site,
    "/tools/clear-cache",
    {},
    { method: "POST", minVersion: MIN_VERSION },
  );
  return `Cleared ${result.cleared.join(", ") || "nothing"} on ${site.name}`;
}

/** For the no-view tool commands: runs on the site last picked in any command. */
export async function runOnSelectedSite(title: string, run: (site: Site) => Promise<string | undefined>) {
  const site = await loadSelectedSite();
  if (!site) {
    await showHUD("Add a site in Manage Bricks Sites first");
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: `${title} on ${site.name}…` });
  try {
    const message = await run(site);
    if (message) await showHUD(message);
    else await toast.hide();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't do that on ${site.name}`;
    toast.message = error instanceof Error ? error.message : String(error);
    if (error instanceof ProLicenseError) {
      toast.title = `Bricks Raycast Pro needed on ${site.name}`;
      toast.primaryAction = { title: "Buy Bricks Raycast Pro", onAction: () => open(BUY_URL) };
    }
  }
}
