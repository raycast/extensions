/**
 * RADIUS & UM command — mirrors the dashboard's RADIUS & UM tab: the RADIUS
 * client and the built-in User Manager, across a hub of entity managers (RADIUS
 * servers, UM users / profiles / limitations / NAS clients / assignments), a
 * read-only sessions view, settings, and per-user usage. Schema-driven from the
 * same `EntityConfig`s the dashboard uses; add/edit via Forms, toggle + remove
 * per row (remove and counter-reset are destructive).
 */
import { useEffect, useState } from "react";
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
import { chartImage, heatmapChart, multiAreaChart } from "./lib/charts";
import { DeviceDropdown, useDevices } from "./lib/devices";
import type { HeatmapPayload, UsagePayload } from "./lib/types";

type Row = Record<string, string>;
interface AaaList {
  available: boolean;
  rows: Row[];
}
interface Field {
  key: string;
  label: string;
  type?: "text" | "number" | "password" | "bool" | "select";
  options?: string[];
  placeholder?: string;
  required?: boolean;
}
interface EntityConfig {
  slug: string;
  title: string;
  idKey: string;
  columns: { key: string; label: string }[];
  fields: Field[];
  toggle?: boolean;
  addOnly?: boolean;
  empty?: string;
}

const isDisabled = (r: Row): boolean =>
  (r.flags ?? "").includes("X") || r.disabled === "yes";
const rowLabel = (r: Row, cfg: EntityConfig): string =>
  r[cfg.idKey] || r.name || r.address || r.user || "(row)";

async function runAaa(
  label: string,
  path: string,
  body: unknown,
  onDone: () => void,
): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: label });
  try {
    const res = await postJson<{
      ok?: boolean;
      message?: string;
      error?: string;
    }>(path, body);
    if (res.error || res.ok === false)
      throw new Error(res.error || res.message || "Operation failed");
    toast.style = Toast.Style.Success;
    toast.title = res.message || "Done";
    onDone();
    return true;
  } catch (e) {
    toast.hide();
    await showFailureToast(e, { title: label });
    return false;
  }
}

// ── entity configs (ported from ui/observability/aaa.tsx) ───────────────────
const RADIUS_CONFIG: EntityConfig = {
  slug: "radius",
  title: "RADIUS Servers",
  idKey: ".id",
  toggle: true,
  columns: [
    { key: "address", label: "Address" },
    { key: "service", label: "Service" },
    { key: "protocol", label: "Proto" },
  ],
  empty: "No RADIUS servers configured.",
  fields: [
    {
      key: "address",
      label: "Address",
      required: true,
      placeholder: "1.2.3.4 or host",
    },
    { key: "secret", label: "Secret", type: "password", required: true },
    {
      key: "service",
      label: "Service",
      required: true,
      placeholder: "login,ppp,hotspot,wireless,dhcp",
    },
    {
      key: "authentication-port",
      label: "Auth port",
      type: "number",
      placeholder: "1812",
    },
    {
      key: "accounting-port",
      label: "Acct port",
      type: "number",
      placeholder: "1813",
    },
    { key: "timeout", label: "Timeout", placeholder: "300ms" },
    { key: "src-address", label: "Src address" },
    { key: "realm", label: "Realm" },
    { key: "called-id", label: "Called ID" },
    { key: "domain", label: "Domain" },
    {
      key: "protocol",
      label: "Protocol",
      type: "select",
      options: ["udp", "radsec"],
    },
    { key: "certificate", label: "Certificate" },
    { key: "comment", label: "Comment" },
    { key: "disabled", label: "Disabled", type: "bool" },
  ],
};
const UM_USERS_CONFIG: EntityConfig = {
  slug: "um-users",
  title: "UM Users",
  idKey: "name",
  toggle: true,
  columns: [
    { key: "name", label: "Name" },
    { key: "group", label: "Group" },
    { key: "caller-id", label: "Caller ID" },
  ],
  empty: "No RADIUS users.",
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "password", label: "Password", type: "password", required: true },
    { key: "group", label: "Group" },
    {
      key: "shared-users",
      label: "Shared users",
      type: "number",
      placeholder: "1",
    },
    { key: "attributes", label: "RADIUS attributes" },
    { key: "caller-id", label: "Caller ID (MAC)" },
    { key: "otp-secret", label: "OTP secret", type: "password" },
    { key: "comment", label: "Comment" },
    { key: "disabled", label: "Disabled", type: "bool" },
  ],
};
const UM_PROFILES_CONFIG: EntityConfig = {
  slug: "um-profiles",
  title: "UM Profiles",
  idKey: "name",
  columns: [
    { key: "name", label: "Name" },
    { key: "validity", label: "Validity" },
    { key: "price", label: "Price" },
  ],
  empty: "No service profiles.",
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "name-for-users", label: "Display name" },
    { key: "validity", label: "Validity", placeholder: "30d" },
    { key: "price", label: "Price", type: "number" },
    {
      key: "starts-when",
      label: "Starts when",
      type: "select",
      options: ["assigned", "first-auth"],
    },
    { key: "override-shared-users", label: "Override shared-users" },
    { key: "comment", label: "Comment" },
  ],
};
const UM_LIMITATIONS_CONFIG: EntityConfig = {
  slug: "um-limitations",
  title: "UM Limitations",
  idKey: "name",
  columns: [
    { key: "name", label: "Name" },
    { key: "rate-limit-rx", label: "Rate ↓" },
    { key: "rate-limit-tx", label: "Rate ↑" },
  ],
  empty: "No limitation templates.",
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "rate-limit-rx", label: "Download rate", placeholder: "10M" },
    { key: "rate-limit-tx", label: "Upload rate", placeholder: "10M" },
    {
      key: "rate-limit-min-rx",
      label: "Min download (CIR)",
      placeholder: "2M",
    },
    { key: "rate-limit-min-tx", label: "Min upload (CIR)", placeholder: "2M" },
    { key: "rate-limit-burst-rx", label: "Burst download", placeholder: "20M" },
    { key: "rate-limit-burst-tx", label: "Burst upload", placeholder: "20M" },
    { key: "download-limit", label: "Download cap", placeholder: "5G" },
    { key: "upload-limit", label: "Upload cap", placeholder: "5G" },
    { key: "transfer-limit", label: "Total transfer cap", placeholder: "10G" },
    { key: "uptime-limit", label: "Uptime cap", placeholder: "1d" },
    { key: "comment", label: "Comment" },
  ],
};
const UM_ROUTERS_CONFIG: EntityConfig = {
  slug: "um-routers",
  title: "UM NAS Clients",
  idKey: "name",
  toggle: true,
  columns: [
    { key: "name", label: "Name" },
    { key: "address", label: "Address" },
    { key: "protocol", label: "Proto" },
  ],
  empty: "No NAS clients registered.",
  fields: [
    { key: "name", label: "Name", required: true },
    {
      key: "address",
      label: "Address",
      required: true,
      placeholder: "192.168.88.1",
    },
    {
      key: "shared-secret",
      label: "Shared secret",
      type: "password",
      required: true,
    },
    { key: "coa-port", label: "CoA port", type: "number" },
    { key: "protocol", label: "Protocol", placeholder: "radius" },
    { key: "comment", label: "Comment" },
    { key: "disabled", label: "Disabled", type: "bool" },
  ],
};
const UM_ASSIGN_CONFIG: EntityConfig = {
  slug: "um-user-profiles",
  title: "UM Assignments",
  idKey: ".id",
  addOnly: true,
  columns: [
    { key: "user", label: "User" },
    { key: "profile", label: "Profile" },
    { key: "state", label: "State" },
  ],
  empty: "No profile assignments.",
  fields: [
    { key: "user", label: "User", required: true },
    { key: "profile", label: "Profile", required: true },
  ],
};
const ENTITIES = [
  RADIUS_CONFIG,
  UM_USERS_CONFIG,
  UM_PROFILES_CONFIG,
  UM_LIMITATIONS_CONFIG,
  UM_ROUTERS_CONFIG,
  UM_ASSIGN_CONFIG,
];

// ── add/edit form ───────────────────────────────────────────────────────────
function EntityForm({
  config,
  device,
  row,
  onDone,
}: {
  config: EntityConfig;
  device: string;
  row?: Row;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  const editing = row?.[config.idKey];

  return (
    <Form
      navigationTitle={`${editing ? "Edit" : "Add"} · ${config.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={editing ? "Save Changes" : "Add"}
            onSubmit={async (values: Record<string, unknown>) => {
              const fields: Record<string, string> = {};
              for (const f of config.fields) {
                const v = values[f.key];
                if (f.type === "bool") fields[f.key] = v ? "yes" : "no";
                else if (v != null && String(v).length > 0)
                  fields[f.key] = String(v);
              }
              const ok = editing
                ? await runAaa(
                    "Saving…",
                    "/api/aaa/update",
                    { device, slug: config.slug, id: editing, fields },
                    onDone,
                  )
                : await runAaa(
                    "Adding…",
                    "/api/aaa/add",
                    { device, slug: config.slug, fields },
                    onDone,
                  );
              if (ok) pop();
            }}
          />
        </ActionPanel>
      }
    >
      {config.fields.map((f) => {
        const cur = row?.[f.key];
        const title = f.required ? `${f.label} *` : f.label;
        if (f.type === "bool")
          return (
            <Form.Checkbox
              key={f.key}
              id={f.key}
              label={f.label}
              defaultValue={cur === "yes"}
            />
          );
        if (f.type === "password")
          return (
            <Form.PasswordField
              key={f.key}
              id={f.key}
              title={title}
              placeholder={f.placeholder}
            />
          );
        if (f.type === "select")
          return (
            <Form.Dropdown
              key={f.key}
              id={f.key}
              title={title}
              defaultValue={cur ?? f.options?.[0]}
            >
              {(f.options ?? []).map((o) => (
                <Form.Dropdown.Item key={o} value={o} title={o} />
              ))}
            </Form.Dropdown>
          );
        return (
          <Form.TextField
            key={f.key}
            id={f.key}
            title={title}
            placeholder={f.placeholder}
            defaultValue={cur}
          />
        );
      })}
    </Form>
  );
}

// ── per-entity manager ──────────────────────────────────────────────────────
function EntityManager({
  config,
  device,
}: {
  config: EntityConfig;
  device: string;
}) {
  const { data, isLoading, revalidate } = useApi<AaaList>(
    `/api/aaa/list/${config.slug}?device=${encodeURIComponent(device)}`,
  );
  const rows = data?.rows ?? [];

  async function remove(r: Row) {
    const id = r[config.idKey];
    const ok = await confirmDestructive({
      title: `Remove ${rowLabel(r, config)}?`,
      actionTitle: "Remove",
    });
    if (!ok) return;
    await runAaa(
      "Removing…",
      "/api/aaa/remove",
      { device, slug: config.slug, id },
      revalidate,
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${config.title} · ${device}`}
      searchBarPlaceholder={`Filter ${config.title.toLowerCase()}…`}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add"
            icon={Icon.Plus}
            target={
              <EntityForm config={config} device={device} onDone={revalidate} />
            }
          />
        </ActionPanel>
      }
    >
      {rows.map((r, i) => {
        const off = isDisabled(r);
        return (
          <List.Item
            key={r[config.idKey] || `${i}`}
            icon={
              config.toggle
                ? {
                    source: Icon.Dot,
                    tintColor: off ? Color.SecondaryText : Color.Green,
                  }
                : Icon.Circle
            }
            title={rowLabel(r, config)}
            subtitle={config.columns
              .slice(1)
              .map((c) => r[c.key])
              .filter(Boolean)
              .join(" · ")}
            accessories={
              config.toggle
                ? [
                    {
                      tag: {
                        value: off ? "disabled" : "enabled",
                        color: off ? Color.SecondaryText : Color.Green,
                      },
                    },
                  ]
                : undefined
            }
            actions={
              <ActionPanel>
                {!config.addOnly ? (
                  <Action.Push
                    title="Edit"
                    icon={Icon.Pencil}
                    target={
                      <EntityForm
                        config={config}
                        device={device}
                        row={r}
                        onDone={revalidate}
                      />
                    }
                  />
                ) : null}
                <Action.Push
                  title="Add"
                  icon={Icon.Plus}
                  target={
                    <EntityForm
                      config={config}
                      device={device}
                      onDone={revalidate}
                    />
                  }
                />
                {config.toggle ? (
                  <Action
                    title={off ? "Enable" : "Disable"}
                    icon={off ? Icon.Checkmark : Icon.Circle}
                    onAction={() =>
                      runAaa(
                        off ? "Enabling…" : "Disabling…",
                        "/api/aaa/toggle",
                        {
                          device,
                          slug: config.slug,
                          id: r[config.idKey],
                          enable: off,
                        },
                        revalidate,
                      )
                    }
                  />
                ) : null}
                <Action
                  title="Remove"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(r)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView
        icon={Icon.Person}
        title={data && !data.available ? "Not available" : "Empty"}
        description={
          data && !data.available
            ? "User Manager / RADIUS not available on this device."
            : config.empty
        }
      />
    </List>
  );
}

// ── sessions (read-only) ────────────────────────────────────────────────────
function SessionsView({ device }: { device: string }) {
  const { data, isLoading, revalidate } = useApi<AaaList>(
    `/api/aaa/list/um-sessions?device=${encodeURIComponent(device)}`,
  );
  usePolling(revalidate, 10000);
  const rows = data?.rows ?? [];
  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Sessions · ${device}`}
      searchBarPlaceholder="Filter sessions…"
    >
      {rows.map((r, i) => (
        <List.Item
          key={r[".id"] || `${i}`}
          icon={{
            source: Icon.Dot,
            tintColor:
              r.status === "active" || !r["end-time"]
                ? Color.Green
                : Color.SecondaryText,
          }}
          title={r.user || r["user-name"] || "(session)"}
          subtitle={[r["calling-station-id"], r["nas-ip-address"]]
            .filter(Boolean)
            .join(" · ")}
          accessories={[
            ...(r["download"] ? [{ text: `↓${r["download"]}` }] : []),
            ...(r["upload"] ? [{ text: `↑${r["upload"]}` }] : []),
            ...(r["uptime"] ? [{ text: r["uptime"] }] : []),
          ]}
        />
      ))}
      <List.EmptyView
        icon={Icon.Person}
        title="No sessions"
        description="No active or historical RADIUS sessions."
      />
    </List>
  );
}

// ── settings (generic key/value forms) ──────────────────────────────────────
function SettingsForm({
  title,
  getPath,
  setPath,
  device,
  onDone,
}: {
  title: string;
  getPath: string;
  setPath: string;
  device: string;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  const { data, isLoading } = useApi<
    { available?: boolean; settings?: Row } & Row
  >(`${getPath}?device=${encodeURIComponent(device)}`);
  const settings: Row = (data?.settings as Row) ?? (data as Row) ?? {};
  const keys = Object.keys(settings).filter(
    (k) => k !== "available" && k !== ".id",
  );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values: Record<string, unknown>) => {
              const fields: Record<string, string> = {};
              for (const k of keys) {
                const v = values[k];
                if (typeof v === "boolean") fields[k] = v ? "yes" : "no";
                else if (v != null) fields[k] = String(v);
              }
              const ok = await runAaa(
                "Saving…",
                setPath,
                { device, fields },
                onDone,
              );
              if (ok) pop();
            }}
          />
        </ActionPanel>
      }
    >
      {keys.length === 0 ? (
        <Form.Description text="No settings reported for this device." />
      ) : null}
      {keys.map((k) => {
        const v = settings[k];
        if (v === "yes" || v === "no")
          return (
            <Form.Checkbox
              key={k}
              id={k}
              label={k}
              defaultValue={v === "yes"}
            />
          );
        return <Form.TextField key={k} id={k} title={k} defaultValue={v} />;
      })}
    </Form>
  );
}

function SamplerForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();
  const { data, isLoading } = useApi<{ intervalMs: number }>(
    "/api/usage/sampler",
  );
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Usage Sampler"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (v: { intervalMs: string }) => {
              const ok = await runAaa(
                "Saving…",
                "/api/usage/sampler",
                { intervalMs: Number(v.intervalMs) },
                onDone,
              );
              if (ok) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="intervalMs"
        title="Interval (ms)"
        defaultValue={String(data?.intervalMs ?? 60000)}
      />
    </Form>
  );
}

function SettingsMenu({ device }: { device: string }) {
  return (
    <List navigationTitle={`AAA Settings · ${device}`}>
      <List.Item
        icon={Icon.Envelope}
        title="RADIUS Incoming (CoA)"
        actions={
          <ActionPanel>
            <Action.Push
              title="Edit"
              icon={Icon.Pencil}
              target={
                <SettingsForm
                  title="RADIUS Incoming"
                  getPath="/api/aaa/radius-incoming"
                  setPath="/api/aaa/radius-incoming"
                  device={device}
                  onDone={() => {}}
                />
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Gear}
        title="User Manager Settings"
        actions={
          <ActionPanel>
            <Action.Push
              title="Edit"
              icon={Icon.Pencil}
              target={
                <SettingsForm
                  title="UM Settings"
                  getPath="/api/aaa/um-settings"
                  setPath="/api/aaa/um-settings"
                  device={device}
                  onDone={() => {}}
                />
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Clock}
        title="Usage Sampler Interval"
        actions={
          <ActionPanel>
            <Action.Push
              title="Edit"
              icon={Icon.Pencil}
              target={<SamplerForm onDone={() => {}} />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={{ source: Icon.ArrowCounterClockwise, tintColor: Color.Red }}
        title="Reset RADIUS Counters"
        actions={
          <ActionPanel>
            <Action
              title="Reset Counters"
              icon={Icon.ArrowCounterClockwise}
              style={Action.Style.Destructive}
              onAction={async () => {
                const ok = await confirmDestructive({
                  title: "Reset RADIUS counters?",
                  message: "Zeroes all RADIUS client counters.",
                  actionTitle: "Reset",
                });
                if (ok)
                  await runAaa(
                    "Resetting…",
                    "/api/aaa/radius-reset-counters",
                    { device },
                    () => {},
                  );
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

// ── usage & heatmap ─────────────────────────────────────────────────────────
function UserUsageView({ device, user }: { device: string; user: string }) {
  const usage = useApi<UsagePayload>(
    `/api/usage/um-user?user=${encodeURIComponent(user)}&device=${encodeURIComponent(device)}&days=90`,
  );
  const heat = useApi<HeatmapPayload>(
    `/api/usage/heatmap?user=${encodeURIComponent(user)}&device=${encodeURIComponent(device)}&days=371`,
  );
  const series = usage.data?.series ?? [];
  const days = heat.data?.days ?? [];
  const usageChart = series.length
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
  const heatChart = days.length
    ? chartImage(
        heatmapChart(days, { color: Color.Green, max: heat.data?.max }),
        "heatmap",
      )
    : "";
  const md = [
    `# Usage · ${user}`,
    ``,
    `### Daily traffic (90d)`,
    ``,
    usageChart,
    heatChart ? `\n### Connection activity\n\n${heatChart}` : "",
  ].join("\n");
  return (
    <Detail
      isLoading={usage.isLoading || heat.isLoading}
      markdown={md}
      navigationTitle={`Usage · ${user}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Total download"
            text={bytes(usage.data?.totalRx ?? 0)}
          />
          <Detail.Metadata.Label
            title="Total upload"
            text={bytes(usage.data?.totalTx ?? 0)}
          />
          <Detail.Metadata.Label
            title="Connections"
            text={String(heat.data?.total ?? 0)}
          />
          <Detail.Metadata.Label
            title="Busiest day"
            text={String(heat.data?.max ?? 0)}
          />
        </Detail.Metadata>
      }
    />
  );
}

function UsageMenu({ device }: { device: string }) {
  const { data, isLoading } = useApi<{ users: string[] }>(
    `/api/usage/um-users?device=${encodeURIComponent(device)}`,
  );
  const users = data?.users ?? [];
  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Usage · ${device}`}
      searchBarPlaceholder="Filter users…"
    >
      {users.map((u) => (
        <List.Item
          key={u}
          icon={Icon.Person}
          title={u}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Usage"
                icon={Icon.BarChart}
                target={<UserUsageView device={device} user={u} />}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        icon={Icon.Person}
        title="No users"
        description="No User Manager users with usage history."
      />
    </List>
  );
}

// ── hub ─────────────────────────────────────────────────────────────────────
export default function Command() {
  const devicesQ = useDevices();
  const [device, setDevice] = useState("");
  useEffect(() => {
    if (!device && devicesQ.data)
      setDevice(
        devicesQ.data.defaultDevice || devicesQ.data.devices[0]?.name || "",
      );
  }, [devicesQ.data, device]);
  const deviceNames = devicesQ.data?.devices.map((d) => d.name) ?? [];

  return (
    <List
      isLoading={devicesQ.isLoading}
      searchBarPlaceholder="RADIUS & User Manager…"
      searchBarAccessory={
        <DeviceDropdown
          devices={deviceNames}
          value={device}
          onChange={setDevice}
          tooltip="Router"
        />
      }
    >
      <List.Section title="RADIUS & User Manager" subtitle={device}>
        {ENTITIES.map((cfg) => (
          <List.Item
            key={cfg.slug}
            icon={Icon.List}
            title={cfg.title}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open"
                  icon={Icon.ArrowRight}
                  target={<EntityManager config={cfg} device={device} />}
                />
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          icon={Icon.Livestream}
          title="Sessions"
          actions={
            <ActionPanel>
              <Action.Push
                title="Open"
                icon={Icon.ArrowRight}
                target={<SessionsView device={device} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.BarChart}
          title="Usage & Heatmap"
          actions={
            <ActionPanel>
              <Action.Push
                title="Open"
                icon={Icon.ArrowRight}
                target={<UsageMenu device={device} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Gear}
          title="Settings"
          actions={
            <ActionPanel>
              <Action.Push
                title="Open"
                icon={Icon.ArrowRight}
                target={<SettingsMenu device={device} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
