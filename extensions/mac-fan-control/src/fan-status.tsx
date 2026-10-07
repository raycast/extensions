import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Toast,
  showToast,
  Keyboard,
} from "@raycast/api";
import { useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import {
  FanStatus,
  average,
  mode,
  readStatus,
  rpm,
  setAutomatic,
  setPercent,
} from "macos-fan-control-client";

// Reading the temperatures walks the whole SMC key index (~0.5 s), so poll on a
// calmer cadence than the fans themselves change.
const REFRESH_INTERVAL_MS = 5000;

function markdown(
  status: FanStatus | undefined,
  error: Error | undefined,
): string {
  if (error)
    return `# Fan Control Unavailable\n\n${error.message}\n\nPress ⌘R to retry.`;
  if (!status) return "# Fan Status";
  const rows = status.fans
    .map(
      (fan) =>
        `| ${fan.index} | ${rpm(fan.actual)} | ${Math.round(fan.percent)}% | ${rpm(fan.target)} | ${Math.round(fan.minimum)}–${Math.round(fan.maximum)} | ${fan.forced ? "Forced" : "Auto"} |`,
    )
    .join("\n");
  const temps = status.temperatures
    ? `\n## Temperature\n\n| Group | Average | Sensors |\n| --- | --- | --- |\n| CPU | ${status.temperatures.cpu.toFixed(1)} °C | ${status.temperatures.cpuSensors} |\n| GPU | ${status.temperatures.gpu.toFixed(1)} °C | ${status.temperatures.gpuSensors} |\n`
    : "";
  return `# Fan Status\n\n| Fan | Actual | Load | Target | Range | Mode |\n| --- | --- | --- | --- | --- | --- |\n${rows}\n${temps}`;
}

export default function Command() {
  // The failure is shown in the view; without this a missing core would toast on
  // every poll tick.
  const { data, isLoading, error, revalidate } = useCachedPromise(
    readStatus,
    [true],
    {
      onError: () => {
        // Shown in the view instead.
      },
    },
  );
  const fans = data?.fans ?? [];

  useEffect(() => {
    const timer = setInterval(revalidate, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  async function apply(action: () => Promise<string>, title: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await action();
      toast.style = Toast.Style.Success;
      toast.title = title;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = (error as Error).message;
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown(data, error)}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Mode">
              <Detail.Metadata.TagList.Item
                text={mode(fans)}
                color={mode(fans) === "Forced" ? Color.Blue : Color.Green}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="Average"
              text={`${Math.round(average(fans))}%`}
            />
            <Detail.Metadata.Label title="Fans" text={String(data.fanCount)} />
            {data.temperatures ? (
              <Detail.Metadata.Label
                title="CPU / GPU"
                text={`${data.temperatures.cpu.toFixed(1)} / ${data.temperatures.gpu.toFixed(1)} °C`}
              />
            ) : null}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action
            title="Force Maximum"
            icon={Icon.Bolt}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            onAction={() => apply(() => setPercent(100), "Fans at maximum")}
          />
          <Action
            title="Restore Automatic"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => apply(setAutomatic, "Fans on automatic")}
          />
        </ActionPanel>
      }
    />
  );
}
