import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useAtomicClock } from "./lib/useAtomicClock";
import { analogClockDataUri } from "./lib/analogClockSvg";
import { formatDriftMs, formatRelativeSync } from "./lib/format";
import { getActiveTimeZoneLabel } from "./lib/timezone";

export default function AnalogClock() {
  const { now, offset, isSyncing, error, resync } = useAtomicClock(200);

  const markdown = `![Analog atomic clock](${analogClockDataUri(now)})${
    error ? `\n\n⚠️ NTP sync failed: ${error}. Showing system clock.` : ""
  }`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isSyncing}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="System Clock Drift" text={formatDriftMs(offset?.offsetMs)} />
          <Detail.Metadata.Label title="Timezone" text={getActiveTimeZoneLabel()} />
          <Detail.Metadata.Label title="NTP Server" text={offset?.server ?? "unsynced"} />
          <Detail.Metadata.Label title="Last Synced" text={formatRelativeSync(offset?.syncedAtMs)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Resync Now" icon={Icon.ArrowClockwise} onAction={() => resync()} />
        </ActionPanel>
      }
    />
  );
}
