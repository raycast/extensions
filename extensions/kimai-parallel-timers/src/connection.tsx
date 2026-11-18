import {
  Action,
  ActionPanel,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { client } from "./shared";
export default function Command() {
  const api = client();
  const { data, isLoading, revalidate, error } = usePromise(async () => {
    const [config, active] = await Promise.all([api.config(), api.active()]);
    return { config, active };
  }, []);
  const markdown = `# Kimai connection\n\nServer: ${api.base}\n\n${error ? `Connection failed: ${error.message}` : data ? `Active timers: **${data.active.length}**\n\nServer limit: **${data.config.activeEntriesHardLimit}**\n\nOverlapping entries: **${data.config.isAllowOverlapping ? "allowed" : "disabled"}**\n\nTracking mode: ${data.config.trackingMode}` : "Checking…"}\n\n## Enable parallel timers\n\nIn Kimai → System → Settings → Timesheet, enable **Allow overlapping time entries** and set **Permitted number of simultaneously running time entries** to at least 2. Administrator permissions are required.\n\nThe extension checks this configuration before starting a timer and refuses to start when it would replace a running timer.\n\nKimai has customers, projects and activities; it does not have Toggl workspaces. Configure a single Kimai server in extension preferences.`;
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={revalidate} />
          <Action
            title="Extension Preferences"
            onAction={openExtensionPreferences}
          />
          <Action.OpenInBrowser title="Open Kimai" url={api.base} />
        </ActionPanel>
      }
    />
  );
}
