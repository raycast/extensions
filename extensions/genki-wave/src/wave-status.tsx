import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";

import { getStatus, identify, readListenerLog } from "./helper";
import * as listener from "./listener";
import { readingAge, ringState, staleReading } from "./summary";

export default function WaveStatus() {
  const { data, isLoading, error, revalidate } = usePromise(getStatus);
  const running = usePromise(listener.isRunning);
  // The listener's file keeps the last reading after the ring goes away; say so.
  const stale =
    data &&
    staleReading({
      running: running.data === true,
      ring: ringState(readListenerLog()),
      updatedAt: data.updatedAt,
      now: Date.now(),
    });

  const markdown = error
    ? `## Couldn't reach Wave\n\n${error.message}\n\nMake sure the ring is on and nearby.`
    : data
      ? `# ${data.name}\n\n## ${Math.round(data.battery.percentage)}% battery${data.battery.isCharging ? " · charging" : ""}` +
        (stale ? `\n\n_${stale}_` : "")
      : "Looking for Wave…";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Battery">
              <Detail.Metadata.TagList.Item
                text={`${Math.round(data.battery.percentage)}%`}
                color={data.battery.percentage < 20 ? Color.Red : Color.Green}
              />
            </Detail.Metadata.TagList>
            {data.updatedAt && <Detail.Metadata.Label title="Reading" text={readingAge(data.updatedAt, Date.now())} />}
            <Detail.Metadata.Label title="Voltage" text={`${data.battery.voltage.toFixed(2)} V`} />
            <Detail.Metadata.Label title="Charging" text={data.battery.isCharging ? "Yes" : "No"} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Firmware" text={data.firmwareVersion} />
            <Detail.Metadata.Label title="Board" text={data.boardVersion} />
            <Detail.Metadata.Label title="Serial Number" text={data.serialNumber} />
            <Detail.Metadata.Label title="Bluetooth Address" text={data.bluetoothAddress} />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              revalidate();
              running.revalidate();
            }}
          />
          <Action
            title="Identify Wave"
            icon={Icon.Eye}
            onAction={async () => {
              try {
                await identify();
              } catch (e) {
                await showFailureToast(e, { title: "Identify failed" });
              }
            }}
          />
          {data && <Action.CopyToClipboard title="Copy Serial Number" content={data.serialNumber} />}
        </ActionPanel>
      }
    />
  );
}
