/**
 * Packet Capture command — mirrors the dashboard's Packets tab: the host-side
 * TZSP receiver's live decoded packets, protocol mix, and top talkers. Polls
 * `/api/capture/packets` every 1.5 s (the response carries both packets and
 * stats). Start/stop the receiver and download the accumulated pcap.
 */
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { postJson, withToken } from "./lib/api";
import { showFailureToast } from "./lib/confirm";
import { bytes, clock, num } from "./lib/format";
import { useApi, usePolling } from "./lib/hooks";
import { barChart, chartImage } from "./lib/charts";
import type { CapturePayload, CaptureStats } from "./lib/types";

function protoColor(proto: string): Color {
  const p = proto.toLowerCase();
  if (p.includes("tcp")) return Color.Blue;
  if (p.includes("udp")) return Color.Green;
  if (p.includes("icmp")) return Color.Orange;
  if (p.includes("arp")) return Color.Purple;
  return Color.SecondaryText;
}

function StatsView({ stats }: { stats: CaptureStats }) {
  const protos = Object.entries(stats.protocols).sort((a, b) => b[1] - a[1]);
  const protoChart = protos.length
    ? chartImage(
        barChart(
          protos
            .slice(0, 10)
            .map(([p, n]) => ({ label: p, value: n, color: protoColor(p) })),
          { labelWidth: 120 },
        ),
        "protocols",
      )
    : "_None yet._";
  const talkerChart = stats.topTalkers.length
    ? chartImage(
        barChart(
          stats.topTalkers
            .slice(0, 10)
            .map((t) => ({ label: t.addr, value: t.count, color: Color.Blue })),
          { labelWidth: 180 },
        ),
        "talkers",
      )
    : "_None yet._";
  const md = [
    `# Capture Stats`,
    ``,
    `### Protocols`,
    ``,
    protoChart,
    ``,
    `### Top talkers`,
    ``,
    talkerChart,
  ].join("\n");
  return (
    <Detail
      markdown={md}
      navigationTitle="Capture Stats"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="State"
            text={stats.running ? "capturing" : "stopped"}
          />
          <Detail.Metadata.Label title="UDP port" text={String(stats.port)} />
          <Detail.Metadata.Label title="Packets" text={num(stats.packets)} />
          <Detail.Metadata.Label title="Bytes" text={bytes(stats.bytes)} />
          <Detail.Metadata.Label
            title="pcap frames"
            text={num(stats.pcapFrames)}
          />
        </Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const { data, isLoading, revalidate } = useApi<CapturePayload>(
    "/api/capture/packets?limit=150",
  );
  usePolling(revalidate, 1500);

  const stats = data?.stats;
  const packets = data?.packets ?? [];

  async function control(action: "start" | "stop") {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${action === "start" ? "Starting" : "Stopping"} capture…`,
    });
    try {
      const res = await postJson<{
        ok?: boolean;
        error?: string;
        message?: string;
      }>(`/api/capture/${action}`, {});
      if (res.error || res.ok === false)
        throw new Error(res.error ?? res.message ?? "Request failed");
      toast.style = Toast.Style.Success;
      toast.title = action === "start" ? "Capture started" : "Capture stopped";
      revalidate();
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: `Could not ${action} capture` });
    }
  }

  const controls = (
    <ActionPanel.Section>
      {stats?.running ? (
        <Action
          title="Stop Capture"
          icon={Icon.Stop}
          style={Action.Style.Destructive}
          onAction={() => control("stop")}
        />
      ) : (
        <Action
          title="Start Capture"
          icon={Icon.Play}
          onAction={() => control("start")}
        />
      )}
      {stats ? (
        <Action.Push
          title="Stats & Protocols"
          icon={Icon.BarChart}
          target={<StatsView stats={stats} />}
        />
      ) : null}
      {stats && stats.pcapFrames > 0 ? (
        <Action.OpenInBrowser
          title="Download Pcap"
          icon={Icon.Download}
          url={withToken("/api/capture/pcap")}
        />
      ) : null}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter packets…"
      navigationTitle={
        stats
          ? `Capture · ${stats.running ? "live" : "stopped"} · ${num(stats.packets)} pkts · ${bytes(stats.bytes)}`
          : "Packet Capture"
      }
    >
      <List.Section
        title={stats ? `UDP ${stats.port}` : "Capture"}
        subtitle={stats?.running ? "capturing" : "stopped"}
      >
        {packets.map((p, i) => (
          <List.Item
            key={`${p.ts}-${i}`}
            icon={{
              source: Icon.Dot,
              tintColor: protoColor(p.protocol ?? p.ethType),
            }}
            title={p.protocol ?? p.ethType}
            subtitle={[p.src, p.dst].filter(Boolean).join(" → ") || p.info}
            accessories={[{ text: `${p.len} B` }, { text: clock(p.ts) }]}
            actions={<ActionPanel>{controls}</ActionPanel>}
          />
        ))}
      </List.Section>
      <List.EmptyView
        icon={{
          source: Icon.Livestream,
          tintColor: stats?.running ? Color.Green : Color.SecondaryText,
        }}
        title={stats?.running ? "Waiting for packets…" : "Capture stopped"}
        description={
          stats?.running
            ? "The TZSP receiver is live. Mirror traffic to it to see packets."
            : "Start the capture, or launch it via the start_packet_capture MCP tool."
        }
        actions={<ActionPanel>{controls}</ActionPanel>}
      />
    </List>
  );
}
