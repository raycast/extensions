import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { RecoveryActions, failureMarkdown } from "./lib/components";
import { FanBarStatus, formatCelsius, formatRPM, modeLabel, restoreLabel, runFanBar } from "./lib/fanbar";

export default function FanStatus() {
  const { data, error, isLoading, revalidate } = usePromise(async () => (await runFanBar(["status"])).status, [], {
    onError: () => undefined,
  });

  if (error && !isLoading) {
    return (
      <Detail
        markdown={failureMarkdown(error)}
        actions={
          <ActionPanel>
            <RecoveryActions onRetry={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? statusMarkdown(data) : ""}
      metadata={data ? <StatusMetadata status={data} /> : undefined}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          {data && <Action.CopyToClipboard title="Copy Status" content={statusMarkdown(data)} />}
        </ActionPanel>
      }
    />
  );
}

function statusMarkdown(status: FanBarStatus): string {
  const lines = [`# ${modeLabel(status)}`];
  const restore = restoreLabel(status);
  if (restore) lines.push("", `${restore}.`);
  if (!status.helperEnabled) {
    lines.push("", "> FanBar's control service is not enabled. Approve it in FanBar to change fan modes.");
  }
  lines.push("", "| Fan | Speed | Range |", "|---|---|---|");
  for (const fan of status.fans) {
    lines.push(
      `| Fan ${fan.index + 1} | ${formatRPM(fan.currentRPM)} | ${fan.minimumRPM.toLocaleString("en-US")}–${formatRPM(fan.maximumRPM)} |`,
    );
  }
  if (status.fans.length === 0) lines.push("| — | No fans reported | |");
  return lines.join("\n");
}

function StatusMetadata(props: { status: FanBarStatus }) {
  const { status } = props;
  const temperatures: [string, number | undefined][] = [
    ["CPU", status.cpuCelsius],
    ["GPU", status.gpuCelsius],
    ["SSD", status.ssdCelsius],
  ];
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Mode" text={modeLabel(status)} />
      {status.curveOutputPercent !== undefined && (
        <Detail.Metadata.Label title="Curve Output" text={`${Math.round(status.curveOutputPercent)}%`} />
      )}
      {restoreLabel(status) && <Detail.Metadata.Label title="Restore" text={restoreLabel(status)} />}
      <Detail.Metadata.Label
        title="Control Service"
        text={status.helperEnabled ? "Enabled" : "Not enabled"}
        icon={status.helperEnabled ? Icon.CheckCircle : Icon.Warning}
      />
      <Detail.Metadata.Separator />
      {temperatures.map(([label, value]) => (
        <Detail.Metadata.Label key={label} title={label} text={value === undefined ? "—" : formatCelsius(value)} />
      ))}
    </Detail.Metadata>
  );
}
