import { Action, ActionPanel, Color, Detail, getPreferenceValues, showToast, Toast, useNavigation } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import useInterval from "../hooks/use-interval";
import useUnifi from "../hooks/use-unifi";
import { type Device, type DeviceStats } from "../lib/unifi/types/device";
import { bpsToHumanReadable, secondsToHumanReadable } from "../lib/utils";

interface DeviceLiveStatsProps {
  device: Device | undefined;
}

const { statsPollingInterval } = getPreferenceValues<Preferences.ViewDevices>();
const pollingInterval = isNaN(parseInt(statsPollingInterval)) ? 2000 : parseInt(statsPollingInterval) * 1000;

function DeviceLiveStats({ device }: DeviceLiveStatsProps) {
  const { pop } = useNavigation();
  const [polling, setPolling] = useState(true);
  const { client, siteIsLoading } = useUnifi();
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
  const [pollingToast, setPollingToast] = useState<Toast | null>(null);

  useEffect(() => {
    return () => {
      // Clean up toast when component unmounts
      if (pollingToast) {
        pollingToast.hide();
        setPollingToast(null);
        setPolling(false);
      }
    };
  }, [pollingToast]);

  useEffect(() => {
    if (!client?.isSiteSet() || !device) return;
    fetchStats();
  }, [client, siteIsLoading]);

  useInterval(
    () => {
      if (!client?.isSiteSet() || !device) return;
      fetchStats();
    },
    polling ? pollingInterval : null,
  );

  useEffect(() => {
    if (!polling && pollingToast) {
      stopPollingToast();
    } else if (!pollingToast) {
      startPollingToast();
    }
  }, [polling]);

  const startPollingToast = useCallback(async () => {
    setPollingToast(
      await showToast({
        style: Toast.Style.Animated,
        title: "Polling live stats",
      }),
    );
  }, [pollingToast]);

  const stopPollingToast = useCallback(async () => {
    await pollingToast?.hide();
    setPollingToast(null);
  }, [pollingToast]);

  const fetchStats = useCallback(async () => {
    if (!client?.isSiteSet() || !device) return;
    const stats = await client.GetDeviceStats(device.id);
    setDeviceStats(stats);
  }, [client, device]);

  const markdown = useCallback(
    () => `
### ${device?.name}

${
  deviceStats?.interfaces?.radios
    ? `
| **Radio**  | TX Retries  |
| ---------- | ----------: |
${deviceStats?.interfaces?.radios?.map((radio) => `| ${radio.frequencyGHz} GHz | ${radio.txRetriesPct}% |`).join("\n")}
`
    : ""
}

${
  device?.uplink
    ? `
| **Uplink**  | RX Rate | TX Rate |
| ----------- | -------: | -------: |
 ${deviceStats?.uplink && `| ${device?.uplink.deviceName} | ${bpsToHumanReadable(deviceStats.uplink.rxRateBps)} | ${bpsToHumanReadable(deviceStats.uplink.txRateBps)} | `}
`
    : ""
}

`,
    [deviceStats],
  );

  if (device?.state !== "ONLINE") {
    return (
      <Detail
        navigationTitle={device?.name}
        isLoading={!deviceStats}
        markdown={`# ${device?.name}\n\nDevice is not online`}
        actions={
          <ActionPanel>
            <Action title="Back" onAction={pop} />
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title={`State`} text={device?.state} />
          </Detail.Metadata>
        }
      />
    );
  }

  return (
    <Detail
      navigationTitle={device?.name}
      isLoading={!deviceStats}
      markdown={markdown()}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={client?.GetDeviceUrl(device.macAddress) ?? ""} />
          <Action title="Back" onAction={pop} />
          {polling ? (
            <Action title="Stop Polling" onAction={() => setPolling(false)} />
          ) : (
            <Action title="Start Polling" onAction={() => setPolling(true)} />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={`IP Address`} text={device?.ipAddress} />
          <Detail.Metadata.Label title={`MAC Address`} text={device?.macAddress} />
          <Detail.Metadata.Label title={`Uptime`} text={`${secondsToHumanReadable(deviceStats?.uptimeSec || 0)}`} />
          <Detail.Metadata.Separator />
          {deviceStats?.loadAverage1Min ? (
            <Detail.Metadata.Label
              title={`Load Average`}
              text={`${deviceStats.loadAverage1Min} / ${deviceStats.loadAverage5Min} / ${deviceStats.loadAverage15Min}`}
            />
          ) : null}
          {deviceStats?.cpuUtilizationPct ? (
            <Detail.Metadata.Label
              title={`CPU`}
              text={`${deviceStats?.cpuUtilizationPct}%`}
              icon={getProgressIcon(deviceStats.cpuUtilizationPct / 100, Color.Blue)}
            />
          ) : null}
          {deviceStats?.memoryUtilizationPct ? (
            <Detail.Metadata.Label
              title={`Memory`}
              text={`${deviceStats?.memoryUtilizationPct}%`}
              icon={getProgressIcon(deviceStats.memoryUtilizationPct / 100, Color.Blue)}
            />
          ) : null}
        </Detail.Metadata>
      }
    />
  );
}

export { DeviceLiveStats };
