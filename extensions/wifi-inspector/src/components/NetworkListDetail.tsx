import { Color, Icon, List } from "@raycast/api";

import { displaySsid, formatChannel, signalColor, signalLabel, statusHeadline } from "../lib/format";
import { formatLatency, formatMbps, type SpeedTestResult } from "../lib/speedtest";
import type { WifiNetwork } from "../lib/types";

/**
 * Metadata-only detail pane.
 * Mixing markdown + metadata forces a tall empty markdown band above the facts.
 */
export function NetworkListDetail({
  network,
  speedResult,
  isSpeedTesting,
}: {
  network: WifiNetwork;
  speedResult?: SpeedTestResult | null;
  isSpeedTesting?: boolean;
}) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={statusHeadline(network)}
              color={network.current ? Color.Green : signalColor(network.rssi)}
            />
          </List.Item.Detail.Metadata.TagList>

          {network.current ? (
            <List.Item.Detail.Metadata.TagList title="Flags">
              <List.Item.Detail.Metadata.TagList.Item text="Connected" color={Color.Green} />
              {network.saved ? <List.Item.Detail.Metadata.TagList.Item text="Saved" color={Color.Purple} /> : null}
            </List.Item.Detail.Metadata.TagList>
          ) : network.saved ? (
            <List.Item.Detail.Metadata.TagList title="Flags">
              <List.Item.Detail.Metadata.TagList.Item text="Saved" color={Color.Purple} />
            </List.Item.Detail.Metadata.TagList>
          ) : null}

          {network.current ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Download"
                text={isSpeedTesting || !speedResult ? "Measuring…" : formatMbps(speedResult.downloadMbps)}
                icon={Icon.ArrowDown}
              />
              <List.Item.Detail.Metadata.Label
                title="Upload"
                text={isSpeedTesting || !speedResult ? "Measuring…" : formatMbps(speedResult.uploadMbps)}
                icon={Icon.ArrowUp}
              />
              <List.Item.Detail.Metadata.Label
                title="Latency"
                text={isSpeedTesting || !speedResult ? "Measuring…" : formatLatency(speedResult.latencyMs)}
                icon={Icon.Clock}
              />
              {speedResult && !isSpeedTesting ? (
                <List.Item.Detail.Metadata.Label
                  title="Speed Test"
                  text={`${speedResult.provider} · ${new Date(speedResult.measuredAt).toLocaleTimeString()}`}
                  icon={Icon.Gauge}
                />
              ) : null}
            </>
          ) : null}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="SSID" text={displaySsid(network)} icon={Icon.Wifi} />
          <List.Item.Detail.Metadata.Label
            title="BSSID"
            text={network.bssid?.trim() || "Unavailable"}
            icon={Icon.BarCode}
          />
          <List.Item.Detail.Metadata.Label
            title="Signal"
            text={{ value: signalLabel(network.rssi), color: signalColor(network.rssi) }}
            icon={{ source: Icon.Signal2, tintColor: signalColor(network.rssi) }}
          />
          {network.noise ? (
            <List.Item.Detail.Metadata.Label title="Noise" text={`${network.noise} dBm`} icon={Icon.Waveform} />
          ) : null}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Band" text={network.channel_band || "—"} icon={Icon.Globe} />
          <List.Item.Detail.Metadata.Label title="Channel" text={formatChannel(network)} icon={Icon.Hashtag} />
          <List.Item.Detail.Metadata.Label title="Security" text={network.security || "—"} icon={Icon.Lock} />
          {network.phy_mode ? (
            <List.Item.Detail.Metadata.Label title="PHY Mode" text={network.phy_mode} icon={Icon.ComputerChip} />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
