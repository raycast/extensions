import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useAccountData } from "../hooks/use-account-data";
import { getUsage } from "../services/account";
import { DASHBOARD_URL } from "../services/instabox";
import { formatBytes, formatDateTime, formatSpec, progressBar } from "../utils/format";
import { errorToast } from "../utils/errors";

const GIB = 1024 ** 3;

export function UsageDetail() {
  const {
    data: usage,
    isLoading,
    revalidate,
  } = useAccountData("usage", getUsage, { onError: errorToast("Could not load usage") });

  let markdown = "# Usage and Limits\n\nLoading…";
  if (usage) {
    const { limits } = usage;
    markdown = [
      "# Usage and Limits",
      "",
      `**Machines** ${usage.machines} of ${limits.maxMachines}  `,
      `\`${progressBar(usage.machines, limits.maxMachines)}\``,
      "",
      `**Snapshots** ${usage.snapshots} of ${limits.maxSnapshots}  `,
      `\`${progressBar(usage.snapshots, limits.maxSnapshots)}\``,
      "",
      `**Stored Data** ${formatBytes(usage.storedBytes)} of ${limits.maxStoredGiB} GB  `,
      `\`${progressBar(usage.storedBytes, limits.maxStoredGiB * GIB)}\``,
      "",
      "Stopped and paused machines count toward the machine limit. Stored data is measured about once an hour.",
    ].join("\n");
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Usage and Limits"
      markdown={markdown}
      metadata={
        usage && (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Machine Size"
              icon={Icon.ComputerChip}
              text={formatSpec(usage.limits.machineSpec)}
            />
            <Detail.Metadata.Label title="Full Size" text={formatBytes(usage.logicalBytes)} />
            <Detail.Metadata.Label title="Stored (Compressed)" text={formatBytes(usage.storedBytes)} />
            <Detail.Metadata.Label
              title="Live Snapshots"
              text={usage.limits.liveSnapshots ? "Allowed" : "Not available"}
            />
            <Detail.Metadata.Label
              title="Measured"
              text={usage.computedAt ? formatDateTime(usage.computedAt) : "Not yet"}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Dashboard" url={DASHBOARD_URL} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
