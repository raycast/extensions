import { Action, ActionPanel, Icon, open, showToast, Toast } from "@raycast/api";
import { BUY_URL, ProLicenseError } from "../lib/license";
import { Site } from "../lib/sites";
import { MaintenanceMode, runTool, setMaintenanceMode, Tool } from "../lib/site-tools";

async function withToast(title: string, run: () => Promise<string | undefined>, onDone?: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const message = await run();
    if (message === undefined) {
      await toast.hide();
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = message;
    onDone?.();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't do that";
    toast.message = error instanceof Error ? error.message : String(error);
    if (error instanceof ProLicenseError) {
      toast.title = `Bricks Raycast Pro needed on ${error.site.name}`;
      toast.primaryAction = { title: "Buy Bricks Raycast Pro", onAction: () => open(BUY_URL) };
    }
  }
}

/** Maintenance mode, CSS files, caches and code signatures for one site (administrators). */
export function SiteToolsSubmenu(props: { site: Site; maintenanceMode?: MaintenanceMode; onDone?: () => void }) {
  const { site, maintenanceMode, onDone } = props;
  const tool = (t: Tool, title: string) => () => withToast(`${title}…`, () => runTool(site, t), onDone);
  const mode = (m: MaintenanceMode) => () =>
    withToast("Updating maintenance mode…", () => setMaintenanceMode(site, m), onDone);

  return (
    <ActionPanel.Submenu
      title="Site Tools…"
      icon={Icon.WrenchScrewdriver}
      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
    >
      {maintenanceMode !== "" && (
        <Action title="Turn Off Maintenance Mode" icon={Icon.LockUnlocked} onAction={mode("")} />
      )}
      {maintenanceMode !== "maintenance" && (
        <Action title="Turn On Maintenance Mode" icon={Icon.Lock} onAction={mode("maintenance")} />
      )}
      {maintenanceMode !== "comingSoon" && (
        <Action title="Turn On Coming Soon Mode" icon={Icon.Clock} onAction={mode("comingSoon")} />
      )}
      <Action
        title="Regenerate CSS Files"
        icon={Icon.Code}
        onAction={tool("regenerate-css", "Regenerating CSS files")}
      />
      <Action title="Clear Caches" icon={Icon.Trash} onAction={tool("clear-cache", "Clearing caches")} />
      <Action
        title="Regenerate Code Signatures"
        icon={Icon.Key}
        onAction={tool("regenerate-signatures", "Regenerating code signatures")}
      />
    </ActionPanel.Submenu>
  );
}
