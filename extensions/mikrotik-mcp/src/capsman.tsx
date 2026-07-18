/**
 * CAPsMAN command — mirrors the dashboard's CAPsMAN page for the Wi-Fi fabric:
 * browse every radio (band, channel, client load, co-channel conflicts), the
 * weak-signal clients with their recommended neighbor AP, and the roaming/HA
 * audit findings — all scoped by the device dropdown. Read-only (steering/apply
 * stay in the dashboard, where the snapshot + Safe-Mode confirmation lives).
 */
import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { DeviceDropdown, useDevices } from "./lib/devices";
import { num } from "./lib/format";
import { useApi, usePolling } from "./lib/hooks";

type Band = "2ghz" | "5ghz" | "unknown";
type Severity = "critical" | "high" | "medium" | "low";

interface RadioNode {
  cap: string;
  radioId: string;
  band: Band;
  channel?: number;
  clientCount: number;
  floor?: string;
  conflicts: string[];
}
interface Overview {
  managerEnabled: boolean;
  radios: RadioNode[];
  cochannel: [string, string][];
  totals: { radios: number; clients: number; caps: number };
}
interface WeakClient {
  mac: string;
  currentCap: string;
  currentRadio: string;
  signal: number;
  band: Band;
  recommendCap?: string;
  gainDb?: number;
}
interface Finding {
  finding_id: string;
  category: string;
  severity: Severity;
  confidence: string;
  title: string;
  target: string;
  detail: string;
  recommendation: string;
}

const SEV_COLOR: Record<Severity, Color> = {
  critical: Color.Red,
  high: Color.Orange,
  medium: Color.Yellow,
  low: Color.SecondaryText,
};
const bandLabel = (b: Band): string =>
  b === "2ghz" ? "2.4G" : b === "5ghz" ? "5G" : "?";
const bandColor = (b: Band): Color =>
  b === "5ghz"
    ? Color.Green
    : b === "2ghz"
      ? Color.Yellow
      : Color.SecondaryText;

export default function Command() {
  const { data: devicePayload } = useDevices();
  const devices = devicePayload?.devices?.map((d) => d.name) ?? [];
  const [device, setDevice] = useState<string>("");
  const q = device ? `?device=${encodeURIComponent(device)}` : "";

  const overview = useApi<Overview>(`/api/capsman/overview${q}`);
  const clients = useApi<{ weak: WeakClient[] }>(`/api/capsman/clients${q}`);
  const audit = useApi<{ findings: Finding[]; total: number }>(
    `/api/capsman/audit${q}`,
  );
  const revalidate = () => {
    overview.revalidate();
    clients.revalidate();
    audit.revalidate();
  };
  usePolling(revalidate, 30000);

  const o = overview.data;
  const weak = clients.data?.weak ?? [];
  const findings = audit.data?.findings ?? [];
  const isLoading = overview.isLoading || clients.isLoading || audit.isLoading;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter CAPsMAN fabric…"
      searchBarAccessory={
        devices.length > 1 ? (
          <DeviceDropdown
            devices={devices}
            value={device}
            onChange={setDevice}
            includeAll
          />
        ) : undefined
      }
    >
      {o && !o.managerEnabled ? (
        <List.Item
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="No CAPsMAN manager on this device"
          subtitle="the audit still runs; the fabric is empty"
        />
      ) : null}

      <List.Section
        title="Radios"
        subtitle={
          o
            ? `${num(o.totals.caps)} CAPs · ${num(o.totals.clients)} clients`
            : undefined
        }
      >
        {(o?.radios ?? []).map((r) => (
          <List.Item
            key={`${r.cap}/${r.radioId}`}
            icon={{ source: Icon.Wifi, tintColor: bandColor(r.band) }}
            title={r.cap}
            subtitle={`${r.radioId}${r.floor ? ` · floor ${r.floor}` : ""}`}
            accessories={[
              { tag: { value: bandLabel(r.band), color: bandColor(r.band) } },
              ...(r.channel != null ? [{ text: `ch ${r.channel}` }] : []),
              { text: `${num(r.clientCount)} clients` },
              ...(r.conflicts.length
                ? [
                    {
                      tag: { value: "co-channel", color: Color.Red },
                      icon: Icon.ExclamationMark,
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section
        title="Weak-signal clients"
        subtitle={weak.length ? `${weak.length}` : undefined}
      >
        {weak.map((c) => (
          <List.Item
            key={c.mac}
            icon={{ source: Icon.Person, tintColor: Color.Orange }}
            title={c.mac}
            subtitle={`${c.currentCap} · ${bandLabel(c.band)}`}
            accessories={[
              { tag: { value: `${c.signal} dBm`, color: Color.Orange } },
              ...(c.recommendCap
                ? [
                    {
                      text: `→ ${c.recommendCap}${c.gainDb ? ` (+${c.gainDb})` : ""}`,
                      icon: Icon.ArrowRight,
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy MAC" content={c.mac} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section
        title="Audit findings"
        subtitle={findings.length ? `${findings.length}` : "clean"}
      >
        {findings.map((f) => (
          <List.Item
            key={f.finding_id}
            icon={{ source: Icon.Dot, tintColor: SEV_COLOR[f.severity] }}
            title={f.title}
            subtitle={f.target}
            accessories={[
              { tag: { value: f.severity, color: SEV_COLOR[f.severity] } },
              { text: f.confidence === "proven" ? "proven" : "verify live" },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Recommendation"
                  content={f.recommendation}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
