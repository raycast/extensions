/**
 * Clients command — mirrors the dashboard's Clients tab: the LAN devices on a
 * selected router (DHCP-lease/ARP), with live per-client traffic (delta rates
 * from `/api/clients/traffic-bulk`, polled ~1.5 s), and the full block/allow/
 * pin/set-ip/label/limits action set. Mutations hit the same RouterOS ops the
 * MCP tools wrap; block + limit-removal are gated as destructive.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { postJson } from "./lib/api";
import { confirmDestructive, showFailureToast } from "./lib/confirm";
import { bytes } from "./lib/format";
import { useApi, usePolling } from "./lib/hooks";
import { chartImage, multiAreaChart } from "./lib/charts";
import { DeviceDropdown, useDevices } from "./lib/devices";
import type { UsagePayload } from "./lib/types";

interface Client {
  mac: string;
  ip: string;
  host: string;
  iface: string;
  server: string;
  status: string;
  static: boolean;
  blocked: boolean;
  lastSeen: string;
  comment: string;
}
interface DevicesView {
  devices: Client[];
  counts: { total: number; blocked: number; static: number };
  generatedAt: string;
}
interface BulkTrafficSample {
  ts: number;
  queues: Record<
    string,
    {
      txBytes: number;
      rxBytes: number;
      downloadLimit: string;
      uploadLimit: string;
    }
  >;
}
interface ClientOpResult {
  ok?: boolean;
  message?: string;
  error?: string;
}

/** bits/sec → compact rate label. */
function rate(bps: number): string {
  if (bps < 1000) return "0";
  if (bps < 1e6) return `${Math.round(bps / 1e3)}k`;
  return `${(bps / 1e6).toFixed(1)}M`;
}

function clientTitle(c: Client): string {
  return c.host || c.comment || c.ip;
}

async function runOp(
  label: string,
  path: string,
  body: unknown,
  onDone: () => void,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: label });
  try {
    const res = await postJson<ClientOpResult>(path, body);
    if (res.error || res.ok === false)
      throw new Error(res.error || res.message || "Operation failed");
    toast.style = Toast.Style.Success;
    toast.title = res.message || "Done";
    onDone();
  } catch (e) {
    toast.hide();
    await showFailureToast(e, { title: label });
  }
}

function LimitsForm({
  device,
  client,
  onDone,
}: {
  device: string;
  client: Client;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Rate limits · ${clientTitle(client)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Limits"
            onSubmit={async (v: { download: string; upload: string }) => {
              await runOp(
                "Applying limits…",
                "/api/clients/limits",
                {
                  ip: client.ip,
                  device,
                  download: v.download,
                  upload: v.upload,
                },
                onDone,
              );
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Set a simple-queue rate limit for ${client.ip}. Use RouterOS rates like 10M, 512k. Leave blank to clear.`}
      />
      <Form.TextField id="download" title="Download" placeholder="10M" />
      <Form.TextField id="upload" title="Upload" placeholder="5M" />
    </Form>
  );
}

function TextForm({
  title,
  fieldTitle,
  placeholder,
  submitTitle,
  initial,
  onSubmit,
}: {
  title: string;
  fieldTitle: string;
  placeholder: string;
  submitTitle: string;
  initial?: string;
  onSubmit: (value: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            onSubmit={async (v: { value: string }) => {
              await onSubmit(v.value);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="value"
        title={fieldTitle}
        placeholder={placeholder}
        defaultValue={initial}
      />
    </Form>
  );
}

function UsageView({ device, client }: { device: string; client: Client }) {
  const { data, isLoading } = useApi<UsagePayload>(
    `/api/usage/client?ip=${encodeURIComponent(client.ip)}&device=${encodeURIComponent(device)}&days=90`,
  );
  const series = data?.series ?? [];
  const peak = series.reduce((m, d) => Math.max(m, d.rx + d.tx), 0);
  const chart = series.length
    ? chartImage(
        multiAreaChart([
          {
            values: series.map((d) => d.rx),
            color: Color.Blue,
            label: "download",
          },
          {
            values: series.map((d) => d.tx),
            color: Color.Green,
            label: "upload",
          },
        ]),
        "usage",
      )
    : "_No usage history._";
  const md = [
    `# Usage · ${clientTitle(client)}`,
    ``,
    `### Daily traffic (90d)`,
    ``,
    chart,
  ].join("\n");
  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      navigationTitle={`Usage · ${clientTitle(client)}`}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Total download"
              text={bytes(data.totalRx)}
            />
            <Detail.Metadata.Label
              title="Total upload"
              text={bytes(data.totalTx)}
            />
            <Detail.Metadata.Label title="Peak day" text={bytes(peak)} />
            <Detail.Metadata.Label
              title="Window"
              text={`${series.length} days`}
            />
          </Detail.Metadata>
        ) : null
      }
    />
  );
}

export default function Command() {
  const devicesQ = useDevices();
  const [device, setDevice] = useState<string>("");
  useEffect(() => {
    if (!device && devicesQ.data)
      setDevice(
        devicesQ.data.defaultDevice || devicesQ.data.devices[0]?.name || "",
      );
  }, [devicesQ.data, device]);

  const view = useApi<DevicesView>(
    `/api/clients?device=${encodeURIComponent(device)}`,
    { execute: !!device },
  );
  usePolling(view.revalidate, 15000, !!device);

  const traffic = useApi<BulkTrafficSample>(
    `/api/clients/traffic-bulk?device=${encodeURIComponent(device)}`,
    {
      execute: !!device,
    },
  );
  usePolling(traffic.revalidate, 1500, !!device);

  // Compute per-IP bit-rates from consecutive cumulative-byte samples.
  const prevRef = useRef<BulkTrafficSample | null>(null);
  const [rates, setRates] = useState<
    Record<string, { rx: number; tx: number }>
  >({});
  useEffect(() => {
    const cur = traffic.data;
    if (!cur) return;
    const prev = prevRef.current;
    if (prev && cur.ts > prev.ts) {
      const dt = (cur.ts - prev.ts) / 1000;
      const next: Record<string, { rx: number; tx: number }> = {};
      for (const [ip, q] of Object.entries(cur.queues)) {
        const p = prev.queues[ip];
        if (p && dt > 0 && q.rxBytes >= p.rxBytes && q.txBytes >= p.txBytes) {
          next[ip] = {
            rx: ((q.rxBytes - p.rxBytes) * 8) / dt,
            tx: ((q.txBytes - p.txBytes) * 8) / dt,
          };
        }
      }
      setRates(next);
    }
    prevRef.current = cur;
  }, [traffic.data]);

  const deviceNames = useMemo(
    () => devicesQ.data?.devices.map((d) => d.name) ?? [],
    [devicesQ.data],
  );
  const clients = view.data?.devices ?? [];
  const counts = view.data?.counts;

  function statusTags(c: Client): { tag: { value: string; color?: Color } }[] {
    const t: { tag: { value: string; color?: Color } }[] = [];
    if (c.blocked) t.push({ tag: { value: "blocked", color: Color.Red } });
    if (c.static) t.push({ tag: { value: "static", color: Color.Blue } });
    return t;
  }

  return (
    <List
      isLoading={devicesQ.isLoading || view.isLoading}
      searchBarPlaceholder="Filter clients…"
      searchBarAccessory={
        <DeviceDropdown
          devices={deviceNames}
          value={device}
          onChange={setDevice}
          tooltip="Router"
        />
      }
    >
      <List.Section
        title={device || "Clients"}
        subtitle={
          counts
            ? `${counts.total} · ${counts.static} static · ${counts.blocked} blocked`
            : undefined
        }
      >
        {clients.map((c) => {
          const r = rates[c.ip];
          return (
            <List.Item
              key={c.mac || c.ip}
              icon={{
                source: Icon.Desktop,
                tintColor: c.blocked ? Color.Red : Color.PrimaryText,
              }}
              title={clientTitle(c)}
              subtitle={c.ip}
              accessories={[
                ...statusTags(c),
                ...(r
                  ? [
                      {
                        text: `↓${rate(r.rx)} ↑${rate(r.tx)}`,
                        tooltip: "bits/sec",
                      },
                    ]
                  : []),
                { text: c.iface },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Usage History"
                      icon={Icon.BarChart}
                      target={<UsageView device={device} client={c} />}
                    />
                    <Action.Push
                      title="Rate Limits…"
                      icon={Icon.Gauge}
                      target={
                        <LimitsForm
                          device={device}
                          client={c}
                          onDone={view.revalidate}
                        />
                      }
                    />
                    <Action.Push
                      title="Set IP…"
                      icon={Icon.Pencil}
                      target={
                        <TextForm
                          title={`Set IP · ${clientTitle(c)}`}
                          fieldTitle="IP address"
                          placeholder="192.168.88.10"
                          submitTitle="Set IP"
                          initial={c.ip}
                          onSubmit={(ip) =>
                            runOp(
                              "Setting IP…",
                              "/api/clients/set-ip",
                              { mac: c.mac, device, ip },
                              view.revalidate,
                            )
                          }
                        />
                      }
                    />
                    <Action.Push
                      title="Set Label…"
                      icon={Icon.Tag}
                      target={
                        <TextForm
                          title={`Label · ${clientTitle(c)}`}
                          fieldTitle="Comment / label"
                          placeholder="Living-room TV"
                          submitTitle="Save Label"
                          initial={c.comment}
                          onSubmit={(label) =>
                            runOp(
                              "Saving label…",
                              "/api/clients/label",
                              { mac: c.mac, device, label },
                              view.revalidate,
                            )
                          }
                        />
                      }
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {c.blocked ? (
                      <Action
                        title="Allow"
                        icon={Icon.Checkmark}
                        onAction={() =>
                          runOp(
                            "Allowing…",
                            "/api/clients/allow",
                            { mac: c.mac, device },
                            view.revalidate,
                          )
                        }
                      />
                    ) : (
                      <Action
                        title="Block"
                        icon={Icon.MinusCircle}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          const ok = await confirmDestructive({
                            title: `Block ${clientTitle(c)}?`,
                            message:
                              "Cuts this device off the network (drop rule + static lease).",
                            actionTitle: "Block",
                            icon: Icon.MinusCircle,
                          });
                          if (ok)
                            await runOp(
                              "Blocking…",
                              "/api/clients/block",
                              { mac: c.mac, device, comment: c.comment },
                              view.revalidate,
                            );
                        }}
                      />
                    )}
                    {!c.static ? (
                      <Action
                        title="Pin IP (Make Static)"
                        icon={Icon.Pin}
                        onAction={() =>
                          runOp(
                            "Pinning…",
                            "/api/clients/pin",
                            { mac: c.mac, device },
                            view.revalidate,
                          )
                        }
                      />
                    ) : null}
                    <Action
                      title="Remove Limits"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      onAction={() =>
                        runOp(
                          "Removing limits…",
                          "/api/clients/limits",
                          { ip: c.ip, device, download: "", upload: "" },
                          view.revalidate,
                        )
                      }
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy IP"
                      content={c.ip}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.CopyToClipboard title="Copy MAC" content={c.mac} />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={view.revalidate}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.EmptyView
        icon={Icon.Desktop}
        title={device ? "No clients" : "Select a router"}
        description={
          device
            ? "No connected LAN devices reported for this router."
            : "Pick a router from the dropdown."
        }
      />
    </List>
  );
}
