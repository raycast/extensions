/**
 * Config command — the interactive, schema-driven config editor (mirrors the
 * dashboard's redesigned Config page). A hub `List` of section cards (each with an
 * active/deactivate toggle) opens per-section edit Forms ("sheets"); Devices and
 * Modules get dedicated managers. Everything mutates one `cfg` object, so the
 * safe-apply pipeline (validate → preview → Apply with timed auto-revert →
 * Keep/Revert), version history, field guide, per-device tests, and the raw
 * "Edit as JSON" screen all operate on the same source of truth.
 */
import { useEffect, useRef, useState } from "react";
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
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { postJson } from "./lib/api";
import { DiffDetail, diffMarkdown } from "./lib/diff";
import { confirmDestructive, showFailureToast } from "./lib/confirm";
import { bytes } from "./lib/format";
import { useApi } from "./lib/hooks";
import { CONFIG_SECTIONS, DEVICE_FIELDS } from "./config-spec";
import type { CfgField, CfgSection } from "./config-spec";
import type {
  CfgVersion,
  ConfigIssue,
  DeviceStatus,
  DiffSummary,
} from "./lib/types";

interface SaveResp {
  ok?: boolean;
  error?: string;
  errors?: ConfigIssue[];
  pendingId?: string;
  rollbackMs?: number;
  devicesChanged?: boolean;
  summary?: DiffSummary;
  unified?: string;
}

const ROLLBACK_OPTS: [string, number][] = [
  ["30s", 30_000],
  ["60s", 60_000],
  ["2m", 120_000],
  ["no auto-revert", 0],
];

function parseJson(text: string): { obj?: unknown; error?: string } {
  try {
    return { obj: JSON.parse(text) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// ── config helpers ───────────────────────────────────────────────────────────
type Cfg = Record<string, unknown>;
const REDACTED = "«redacted»";
const asObj = (v: unknown): Cfg =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Cfg) : {};
const cfgArr = (v: unknown): string[] =>
  Array.isArray(v) ? (v as string[]) : [];
const uniq = (a: string[]): string[] => [...new Set(a)];
const str = (v: unknown): string =>
  v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);

function sectionObj(cfg: Cfg, s: CfgSection): Cfg {
  return s.path ? asObj(cfg[s.path]) : cfg;
}
function isActive(cfg: Cfg, s: CfgSection): boolean {
  if (!s.enable) return true;
  if (s.enable.presence) return cfg[s.path ?? ""] !== undefined;
  return sectionObj(cfg, s)[s.enable.key ?? "enabled"] !== false;
}
function setSecField(cfg: Cfg, s: CfgSection, key: string, val: unknown): Cfg {
  if (s.path) {
    const obj = { ...asObj(cfg[s.path]) };
    if (val === undefined || val === "") delete obj[key];
    else obj[key] = val;
    return { ...cfg, [s.path]: obj };
  }
  const next = { ...cfg };
  if (val === undefined || val === "") delete next[key];
  else next[key] = val;
  return next;
}
const SECTION_ICON: Record<string, Icon> = {
  devices: Icon.HardDrive,
  mcp: Icon.Terminal,
  dashboard: Icon.BarChart,
  ssh: Icon.Plug,
  s3: Icon.Box,
  memory: Icon.Stars,
  modules: Icon.List,
  general: Icon.Gear,
};

/** Render one CfgField as the matching Raycast Form control. */
function fieldControl(f: CfgField, cur: unknown) {
  if (f.type === "bool")
    return (
      <Form.Checkbox
        key={f.key}
        id={f.key}
        label={f.label}
        defaultValue={cur === true}
      />
    );
  if (f.type === "select")
    return (
      <Form.Dropdown
        key={f.key}
        id={f.key}
        title={f.label}
        defaultValue={str(cur) || f.options?.[0]}
      >
        {(f.options ?? []).map((o) => (
          <Form.Dropdown.Item key={o} value={o} title={o} />
        ))}
      </Form.Dropdown>
    );
  if (f.type === "password")
    return (
      <Form.PasswordField
        key={f.key}
        id={f.key}
        title={f.label}
        placeholder={
          cur === REDACTED ? "unchanged — leave blank to keep" : undefined
        }
      />
    );
  return (
    <Form.TextField
      key={f.key}
      id={f.key}
      title={f.label}
      placeholder={f.placeholder}
      defaultValue={cur == null ? "" : str(cur)}
      info={f.help}
    />
  );
}

function IssuesView({ issues }: { issues: ConfigIssue[] }) {
  return (
    <List navigationTitle="Validation Issues">
      {issues.map((iss, i) => (
        <List.Item
          key={`${iss.path}-${i}`}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={iss.path || "(root)"}
          subtitle={iss.message}
        />
      ))}
      <List.EmptyView
        icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
        title="No issues"
      />
    </List>
  );
}

function PendingView({ resp, onDone }: { resp: SaveResp; onDone: () => void }) {
  const { pop } = useNavigation();
  const rollbackMs = resp.rollbackMs ?? 0;
  const [left, setLeft] = useState(Math.round(rollbackMs / 1000));
  const [reverted, setReverted] = useState(false);

  useEffect(() => {
    if (rollbackMs <= 0) return;
    const id = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(id);
          setReverted(true);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rollbackMs]);

  async function keep() {
    const ok = await confirmDestructive({
      title: "Keep this config permanently?",
      message: "Commits the applied change and writes it to the config file.",
      actionTitle: "Keep",
      icon: Icon.SaveDocument,
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Keeping…",
    });
    try {
      const res = await postJson<{ kept?: boolean; error?: string }>(
        "/api/config/keep",
        { pendingId: resp.pendingId },
      );
      if (!res.kept) throw new Error(res.error ?? "Keep was rejected");
      toast.style = Toast.Style.Success;
      toast.title = "Config kept";
      onDone();
      pop();
    } catch (e) {
      void toast.hide();
      await showFailureToast(e, { title: "Could not keep config" });
    }
  }

  async function revert() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Reverting…",
    });
    try {
      const res = await postJson<{ rolledBack?: boolean; error?: string }>(
        "/api/config/rollback",
        { pendingId: resp.pendingId },
      );
      if (!res.rolledBack)
        throw new Error(res.error ?? "Rollback was rejected");
      toast.style = Toast.Style.Success;
      toast.title = "Reverted";
      onDone();
      pop();
    } catch (e) {
      void toast.hide();
      await showFailureToast(e, { title: "Could not revert" });
    }
  }

  const status = reverted
    ? "**Auto-reverted** — the keep window elapsed, so the server rolled back."
    : rollbackMs > 0
      ? `**Pending** — keep within **${left}s** or it auto-reverts.`
      : "**Pending** — no auto-revert; Keep to commit or Revert to discard.";

  const md = [
    `# Applied (pending)`,
    ``,
    status,
    resp.devicesChanged
      ? `\n> ⚠ Device connection settings changed — reconnect the MCP client.`
      : "",
    `\n${diffMarkdown(resp.unified ?? "", resp.summary)}`,
  ].join("\n");

  return (
    <Detail
      markdown={md}
      navigationTitle={reverted ? "Auto-reverted" : `Pending · ${left}s`}
      actions={
        <ActionPanel>
          {!reverted ? (
            <Action
              title="Keep Changes"
              icon={Icon.SaveDocument}
              onAction={keep}
            />
          ) : null}
          {!reverted ? (
            <Action
              title="Revert Now"
              icon={Icon.ArrowCounterClockwise}
              style={Action.Style.Destructive}
              onAction={revert}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function CheckpointForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Save Checkpoint"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Checkpoint"
            onSubmit={async (v: { label: string }) => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Saving checkpoint…",
              });
              try {
                const res = await postJson<{ ok?: boolean; error?: string }>(
                  "/api/config/history/checkpoint",
                  { label: v.label || undefined },
                );
                if (res.error) throw new Error(res.error);
                toast.style = Toast.Style.Success;
                toast.title = "Checkpoint saved";
                onDone();
                pop();
              } catch (e) {
                void toast.hide();
                await showFailureToast(e, {
                  title: "Could not save checkpoint",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="label"
        title="Label"
        placeholder="before-firewall-change"
      />
    </Form>
  );
}

function HistoryDiff({ id, label }: { id: string; label: string }) {
  const { data, isLoading } = useApi<{
    summary: { added: number; removed: number };
    unified: string;
  }>(`/api/config/history/diff?id=${encodeURIComponent(id)}`);
  return (
    <DiffDetail
      isLoading={isLoading}
      unified={data?.unified ?? ""}
      summary={data?.summary}
      title={`${label} → current`}
      navigationTitle="Version Diff"
    />
  );
}

function HistoryView({ onReload }: { onReload: () => void }) {
  const { data, isLoading, revalidate } = useApi<{
    versions: CfgVersion[];
    bytes: number;
    retention: number;
  }>("/api/config/history");
  const versions = data?.versions ?? [];

  async function restore(v: CfgVersion) {
    const ok = await confirmDestructive({
      title: `Restore version ${v.label ?? v.id.slice(0, 8)}?`,
      message:
        "Swaps the live config to this version (a 'before restore' snapshot is taken first).",
      actionTitle: "Restore",
      icon: Icon.ArrowCounterClockwise,
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Restoring…",
    });
    try {
      const res = await postJson<{ ok?: boolean; error?: string }>(
        "/api/config/history/restore",
        { id: v.id },
      );
      if (!res.ok) throw new Error(res.error ?? "Restore was rejected");
      toast.style = Toast.Style.Success;
      toast.title = "Restored";
      revalidate();
      onReload();
    } catch (e) {
      void toast.hide();
      await showFailureToast(e, { title: "Could not restore" });
    }
  }

  async function del(v: CfgVersion) {
    const ok = await confirmDestructive({
      title: `Delete checkpoint ${v.label ?? v.id.slice(0, 8)}?`,
      actionTitle: "Delete",
    });
    if (!ok) return;
    try {
      await postJson("/api/config/history/delete", { id: v.id });
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: "Could not delete checkpoint" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Config History"
      actions={
        <ActionPanel>
          <Action.Push
            title="Save Checkpoint"
            icon={Icon.Pin}
            target={<CheckpointForm onDone={revalidate} />}
          />
        </ActionPanel>
      }
    >
      {versions.map((v, i) => (
        <List.Item
          key={v.id}
          icon={{
            source: v.kind === "checkpoint" ? Icon.Pin : Icon.Dot,
            tintColor:
              v.kind === "checkpoint" ? Color.Blue : Color.SecondaryText,
          }}
          title={v.label ?? (i === 0 ? "latest" : v.kind)}
          subtitle={new Date(v.ts).toLocaleString()}
          accessories={[
            {
              text:
                v.drift.added || v.drift.removed
                  ? `+${v.drift.added}/−${v.drift.removed}`
                  : "identical",
            },
            { text: bytes(v.bytes) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Diff Against Current"
                icon={Icon.Text}
                target={
                  <HistoryDiff id={v.id} label={v.label ?? v.id.slice(0, 8)} />
                }
              />
              <Action
                title="Restore"
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                onAction={() => restore(v)}
              />
              {v.kind === "checkpoint" ? (
                <Action
                  title="Delete Checkpoint"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => del(v)}
                />
              ) : null}
              <Action.Push
                title="Save Checkpoint"
                icon={Icon.Pin}
                target={<CheckpointForm onDone={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface GuideField {
  path: string;
  type: string;
  def?: unknown;
  desc?: string;
  enumv?: string[];
  required: boolean;
}

function flattenSchema(
  schema: Record<string, unknown> | undefined,
  prefix = "",
): GuideField[] {
  const out: GuideField[] = [];
  const props =
    (schema?.properties as Record<string, Record<string, unknown>>) ?? {};
  const required = (schema?.required as string[]) ?? [];
  for (const [key, val] of Object.entries(props)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const rawType = val.type;
    const type = Array.isArray(rawType)
      ? rawType.join("|")
      : ((rawType as string) ?? (val.enum ? "enum" : "any"));
    out.push({
      path,
      type,
      def: val.default,
      desc: val.description as string | undefined,
      enumv: val.enum as string[] | undefined,
      required: required.includes(key),
    });
    if (val.type === "object" && val.properties)
      out.push(...flattenSchema(val, path));
  }
  return out;
}

function FieldGuideView() {
  const { data, isLoading } =
    useApi<Record<string, unknown>>("/api/config-schema");
  const fields = flattenSchema(data);
  return (
    <List
      isLoading={isLoading}
      navigationTitle="Field Guide"
      searchBarPlaceholder="Search config fields…"
      isShowingDetail
    >
      {fields.map((f) => (
        <List.Item
          key={f.path}
          title={f.path}
          subtitle={f.type}
          keywords={[f.desc ?? ""]}
          accessories={
            f.required
              ? [{ tag: { value: "required", color: Color.Orange } }]
              : undefined
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Path" text={f.path} />
                  <List.Item.Detail.Metadata.Label title="Type" text={f.type} />
                  {f.def !== undefined ? (
                    <List.Item.Detail.Metadata.Label
                      title="Default"
                      text={JSON.stringify(f.def)}
                    />
                  ) : null}
                  {f.enumv ? (
                    <List.Item.Detail.Metadata.TagList title="Values">
                      {f.enumv.map((e) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={e}
                          text={e}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : null}
                  {f.desc ? (
                    <List.Item.Detail.Metadata.Label
                      title="Description"
                      text={f.desc}
                    />
                  ) : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}

interface TestResult {
  reachable?: boolean;
  latencyMs?: number;
  identity?: string;
  error?: string;
}

/** Per-device connection test — mirrors the dashboard's `● name: 12ms · identity` chips. */
function TestDevicesView({ devices }: { devices: Record<string, unknown> }) {
  const names = Object.keys(devices);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const done = Object.keys(results).length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      type TestResp = {
        ok?: boolean;
        status?: DeviceStatus;
        errors?: ConfigIssue[];
      };
      for (const name of names) {
        const r = await postJson<TestResp>("/api/config/test-device", {
          name,
          config: devices[name],
        }).catch((): TestResp => ({ ok: false }));
        if (cancelled) return;
        const res: TestResult =
          r.ok && r.status?.reachable === true
            ? {
                reachable: true,
                latencyMs: r.status.latencyMs ?? 0,
                identity: r.status.identity,
              }
            : {
                reachable: false,
                error:
                  r.status?.error ?? r.errors?.[0]?.message ?? "unreachable",
              };
        setResults((prev) => ({ ...prev, [name]: res }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <List
      isLoading={done < names.length}
      navigationTitle={`Test Devices · ${done}/${names.length}`}
    >
      {names.map((name) => {
        const r = results[name];
        return (
          <List.Item
            key={name}
            icon={
              r
                ? {
                    source: r.reachable ? Icon.CheckCircle : Icon.XMarkCircle,
                    tintColor: r.reachable ? Color.Green : Color.Red,
                  }
                : { source: Icon.Dot, tintColor: Color.SecondaryText }
            }
            title={name}
            subtitle={
              r
                ? r.reachable
                  ? `${Math.round(r.latencyMs ?? 0)}ms · ${r.identity ?? "ok"}`
                  : (r.error ?? "unreachable")
                : "testing…"
            }
            accessories={
              r
                ? [
                    {
                      tag: {
                        value: r.reachable ? "reachable" : "unreachable",
                        color: r.reachable ? Color.Green : Color.Red,
                      },
                    },
                  ]
                : undefined
            }
          />
        );
      })}
      <List.EmptyView icon={Icon.Plug} title="No devices in config" />
    </List>
  );
}

// ── section / device / modules / json screens (the "sheets") ─────────────────

function SectionScreen({
  cfg,
  section,
  onChange,
}: {
  cfg: Cfg;
  section: CfgSection;
  onChange: (c: Cfg) => void;
}) {
  const { pop } = useNavigation();
  const obj = sectionObj(cfg, section);
  const active = isActive(cfg, section);
  return (
    <Form
      navigationTitle={section.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Checkmark}
            onSubmit={(values: Record<string, unknown>) => {
              let next = cfg;
              if (section.enable) {
                const on = values.__enabled === true;
                if (section.enable.presence) {
                  if (!on) {
                    next = { ...cfg };
                    delete next[section.path!];
                    onChange(next);
                    pop();
                    return;
                  }
                  next = { ...cfg, [section.path!]: asObj(cfg[section.path!]) };
                } else {
                  next = setSecField(
                    next,
                    section,
                    section.enable.key ?? "enabled",
                    on,
                  );
                  if (!on) {
                    onChange(next);
                    pop();
                    return;
                  }
                }
              }
              for (const f of section.fields) {
                let v: unknown = values[f.key];
                if (f.type === "bool") v = v === true;
                else if (f.type === "number")
                  v = v === "" || v == null ? undefined : Number(v);
                if (f.secret && (v === "" || v == null)) continue;
                next = setSecField(
                  next,
                  section,
                  f.key,
                  v === "" ? undefined : v,
                );
              }
              onChange(next);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={section.blurb ?? ""} />
      {section.enable && (
        <Form.Checkbox
          id="__enabled"
          label={`Active — ${section.enable.label ?? section.title}`}
          defaultValue={active}
        />
      )}
      {section.fields.map((f) => fieldControl(f, obj[f.key]))}
    </Form>
  );
}

function DeviceForm({
  cfg,
  onChange,
  name,
  isNew,
}: {
  cfg: Cfg;
  onChange: (c: Cfg) => void;
  name: string;
  isNew: boolean;
}) {
  const { pop } = useNavigation();
  const devices = asObj(cfg.devices);
  const dev = asObj(devices[name]);
  return (
    <Form
      navigationTitle={isNew ? "Add Device" : `Device · ${name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isNew ? "Add" : "Save"}
            icon={Icon.Checkmark}
            onSubmit={(values: Record<string, unknown>) => {
              const nm = isNew ? String(values.__name ?? "").trim() : name;
              if (!nm) {
                void showFailureToast(new Error("Device name required"), {
                  title: "Name required",
                });
                return;
              }
              const d: Cfg = isNew
                ? {
                    host: "192.168.88.1",
                    port: 22,
                    username: "admin",
                    password: "",
                    timeoutMs: 10000,
                  }
                : { ...dev };
              for (const f of DEVICE_FIELDS) {
                let v: unknown = values[f.key];
                if (f.type === "number")
                  v = v === "" || v == null ? undefined : Number(v);
                if (f.secret && (v === "" || v == null)) continue;
                if (v === "" || v == null) delete d[f.key];
                else d[f.key] = v;
              }
              onChange({ ...cfg, devices: { ...devices, [nm]: d } });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      {isNew && (
        <Form.TextField id="__name" title="Name" placeholder="core-router" />
      )}
      {DEVICE_FIELDS.map((f) => fieldControl(f, dev[f.key]))}
    </Form>
  );
}

function DevicesScreen({
  cfg,
  onChange,
}: {
  cfg: Cfg;
  onChange: (c: Cfg) => void;
}) {
  const devices = asObj(cfg.devices);
  const names = Object.keys(devices);
  const defaultDevice = str(cfg.defaultDevice);
  const nextName = (): string => {
    let i = 1;
    let n = "device";
    while (devices[n]) n = `device-${++i}`;
    return n;
  };
  const remove = async (n: string): Promise<void> => {
    if (
      !(await confirmDestructive({
        title: `Remove device “${n}”?`,
        actionTitle: "Remove",
      }))
    )
      return;
    const nd = { ...devices };
    delete nd[n];
    const next: Cfg = { ...cfg, devices: nd };
    if (defaultDevice === n) next.defaultDevice = Object.keys(nd)[0] ?? "";
    onChange(next);
  };

  return (
    <List
      navigationTitle="Devices"
      searchBarPlaceholder="Filter devices…"
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Device"
            icon={Icon.Plus}
            target={
              <DeviceForm
                cfg={cfg}
                onChange={onChange}
                name={nextName()}
                isNew
              />
            }
          />
        </ActionPanel>
      }
    >
      {names.map((n) => {
        const d = asObj(devices[n]);
        const off = d.disabled === true;
        return (
          <List.Item
            key={n}
            icon={{
              source: Icon.Dot,
              tintColor: off ? Color.SecondaryText : Color.Green,
            }}
            title={n}
            subtitle={
              d.mac
                ? str(d.mac)
                : `${str(d.host) || "?"}:${str(d.port) || "22"}`
            }
            accessories={[
              ...(defaultDevice === n
                ? [{ tag: { value: "default", color: Color.Blue } }]
                : []),
              {
                tag: {
                  value: off ? "disabled" : "enabled",
                  color: off ? Color.SecondaryText : Color.Green,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  target={
                    <DeviceForm
                      cfg={cfg}
                      onChange={onChange}
                      name={n}
                      isNew={false}
                    />
                  }
                />
                <Action
                  title={off ? "Enable" : "Disable"}
                  icon={off ? Icon.Checkmark : Icon.Circle}
                  onAction={() =>
                    onChange({
                      ...cfg,
                      devices: { ...devices, [n]: { ...d, disabled: !off } },
                    })
                  }
                />
                <Action
                  title="Set as Default"
                  icon={Icon.Star}
                  onAction={() => onChange({ ...cfg, defaultDevice: n })}
                />
                <Action.Push
                  title="Add Device"
                  icon={Icon.Plus}
                  target={
                    <DeviceForm
                      cfg={cfg}
                      onChange={onChange}
                      name={nextName()}
                      isNew
                    />
                  }
                />
                <Action
                  title="Remove"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(n)}
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView
        icon={Icon.HardDrive}
        title="No devices"
        description="Add your first router."
      />
    </List>
  );
}

interface ModuleItem {
  slug: string;
  label: string;
  group: string;
  description: string;
  toolCount: number;
}
function moduleEnabled(tools: Cfg, m: ModuleItem): boolean {
  const dm = cfgArr(tools.disabledModules);
  const dg = cfgArr(tools.disabledGroups);
  const em = cfgArr(tools.enabledModules);
  const eg = cfgArr(tools.enabledGroups);
  if (dm.includes(m.slug) || dg.includes(m.group)) return false;
  if (em.length === 0 && eg.length === 0) return true;
  return em.includes(m.slug) || eg.includes(m.group);
}

function ModulesScreen({
  cfg,
  onChange,
}: {
  cfg: Cfg;
  onChange: (c: Cfg) => void;
}) {
  const { data, isLoading } = useApi<{ modules: ModuleItem[] }>("/api/modules");
  const catalog = data?.modules ?? [];
  const tools = asObj(cfg.tools);
  const toggle = (m: ModuleItem, enable: boolean): void => {
    const em = new Set(cfgArr(tools.enabledModules));
    const dm = new Set(cfgArr(tools.disabledModules));
    if (enable) {
      dm.delete(m.slug);
      if (
        cfgArr(tools.enabledModules).length > 0 ||
        cfgArr(tools.enabledGroups).length > 0
      )
        em.add(m.slug);
    } else {
      em.delete(m.slug);
      dm.add(m.slug);
    }
    onChange({
      ...cfg,
      tools: {
        ...tools,
        enabledModules: uniq([...em]),
        disabledModules: uniq([...dm]),
      },
    });
  };
  const groups = new Map<string, ModuleItem[]>();
  for (const m of catalog)
    groups.set(m.group, [...(groups.get(m.group) ?? []), m]);
  return (
    <List
      isLoading={isLoading}
      navigationTitle="Tool Modules"
      searchBarPlaceholder="Filter modules…"
    >
      {[...groups.entries()].map(([group, items]) => (
        <List.Section
          key={group}
          title={group}
          subtitle={`${items.filter((m) => moduleEnabled(tools, m)).length}/${items.length} on`}
        >
          {items.map((m) => {
            const on = moduleEnabled(tools, m);
            return (
              <List.Item
                key={m.slug}
                icon={{
                  source: on ? Icon.CheckCircle : Icon.Circle,
                  tintColor: on ? Color.Green : Color.SecondaryText,
                }}
                title={m.label}
                subtitle={m.slug}
                keywords={[m.group]}
                accessories={[{ text: `${m.toolCount} tools` }]}
                actions={
                  <ActionPanel>
                    <Action
                      title={on ? "Disable" : "Enable"}
                      icon={on ? Icon.Circle : Icon.Checkmark}
                      onAction={() => toggle(m, !on)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      <List.EmptyView icon={Icon.List} title="No modules" />
    </List>
  );
}

function JsonScreen({
  cfg,
  onChange,
}: {
  cfg: Cfg;
  onChange: (c: Cfg) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Edit as JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply to Form"
            icon={Icon.Checkmark}
            onSubmit={(v: { json: string }) => {
              const p = parseJson(v.json);
              if (p.error) {
                void showFailureToast(new Error(p.error), {
                  title: "Invalid JSON",
                });
                return;
              }
              onChange(asObj(p.obj));
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Advanced: edit the full config as JSON. Applying updates the form; Save/Apply is still done from the main Config screen." />
      <Form.TextArea
        id="json"
        title="Config JSON"
        defaultValue={JSON.stringify(cfg, null, 2)}
      />
    </Form>
  );
}

// ── the editor hub ───────────────────────────────────────────────────────────

type ValidationState =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "issues"; issues: ConfigIssue[] }
  | { state: "valid" };

function Editor({
  initial,
  reload,
}: {
  initial: Record<string, unknown>;
  reload: () => void;
}) {
  const { push } = useNavigation();
  const [cfg, setCfg] = useState<Cfg>(() => asObj(initial));
  const [rollbackMs, setRollbackMs] = useState(60_000);
  const [validation, setValidation] = useState<ValidationState>({
    state: "idle",
  });

  // Debounced schema validation of the working config.
  useEffect(() => {
    setValidation({ state: "checking" });
    const id = setTimeout(async () => {
      try {
        const res = await postJson<{
          ok?: boolean;
          error?: string;
          errors?: ConfigIssue[];
        }>("/api/config/validate", cfg);
        const issues = res.errors ?? [];
        setValidation(
          issues.length
            ? { state: "issues", issues }
            : res.ok
              ? { state: "valid" }
              : { state: "idle" },
        );
      } catch {
        setValidation({ state: "idle" });
      }
    }, 500);
    return () => clearTimeout(id);
  }, [cfg]);

  const preview = async (): Promise<void> => {
    const res = await postJson<{ summary: DiffSummary; unified: string }>(
      "/api/config/preview",
      cfg,
    );
    push(
      <DiffDetail
        unified={res.unified ?? ""}
        summary={res.summary}
        title="Preview"
        navigationTitle="Config Preview"
      />,
    );
  };
  const validateNow = async (): Promise<void> => {
    const res = await postJson<{
      ok?: boolean;
      error?: string;
      errors?: ConfigIssue[];
    }>("/api/config/validate", cfg);
    if (res.errors?.length) push(<IssuesView issues={res.errors} />);
    else if (res.ok)
      void showToast({ style: Toast.Style.Success, title: "Valid ✓" });
    else
      await showFailureToast(
        new Error(res.error ?? "Validation was rejected"),
        { title: "Validation failed" },
      );
  };
  const testDevices = (): void => {
    const devices = asObj(cfg.devices);
    if (Object.keys(devices).length === 0) {
      void showToast({
        style: Toast.Style.Failure,
        title: "No devices in config",
      });
      return;
    }
    push(<TestDevicesView devices={devices} />);
  };
  const apply = async (): Promise<void> => {
    const ok = await confirmDestructive({
      title: "Apply this config live?",
      message:
        rollbackMs > 0
          ? `Applies now; auto-reverts in ${rollbackMs / 1000}s unless you Keep it.`
          : "Applies now with no auto-revert.",
      actionTitle: "Apply",
      icon: Icon.Bolt,
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Applying…",
    });
    try {
      const res = await postJson<SaveResp>("/api/config", {
        config: cfg,
        rollbackMs,
      });
      // A successful apply always returns a pendingId; its absence means the
      // dashboard rejected the apply (validation, HTTP error, or non-JSON body).
      if (!res.pendingId) {
        void toast.hide();
        if (res.errors?.length) push(<IssuesView issues={res.errors} />);
        else
          await showFailureToast(new Error(res.error ?? "Apply was rejected"), {
            title: "Apply failed",
          });
        return;
      }
      void toast.hide();
      push(<PendingView resp={res} onDone={reload} />);
    } catch (e) {
      void toast.hide();
      await showFailureToast(e, { title: "Apply failed" });
    }
  };
  const toggleSection = (s: CfgSection, on: boolean): void => {
    if (!s.enable) return;
    if (s.enable.presence) {
      if (on)
        setCfg({
          ...cfg,
          [s.path!]: Object.keys(sectionObj(cfg, s)).length
            ? cfg[s.path!]
            : s.id === "s3"
              ? { prefix: "", presignExpiresIn: 3600 }
              : {},
        });
      else {
        const c = { ...cfg };
        delete c[s.path!];
        setCfg(c);
      }
      return;
    }
    setCfg(setSecField(cfg, s, s.enable.key ?? "enabled", on));
  };

  const vs = validation.state;
  const statusText =
    vs === "issues"
      ? `⚠ ${validation.issues.length} issue(s)`
      : vs === "valid"
        ? "✓ valid"
        : vs === "checking"
          ? "…validating"
          : "";

  const renderPipeline = () => (
    <>
      <ActionPanel.Section>
        <Action title="Apply Changes" icon={Icon.Bolt} onAction={apply} />
        <Action title="Preview Diff" icon={Icon.Text} onAction={preview} />
        <Action title="Test Devices" icon={Icon.Plug} onAction={testDevices} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={vs === "issues" ? "View Issues" : "Validate Now"}
          icon={Icon.Checkmark}
          onAction={validateNow}
        />
        <Action.Push
          title="Edit as JSON"
          icon={Icon.Code}
          target={<JsonScreen cfg={cfg} onChange={setCfg} />}
        />
        <Action.Push
          title="Version History"
          icon={Icon.Clock}
          target={<HistoryView onReload={reload} />}
        />
        <Action.Push
          title="Field Guide"
          icon={Icon.Book}
          target={<FieldGuideView />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <ActionPanel.Submenu title="Auto-Revert Window" icon={Icon.Clock}>
          {ROLLBACK_OPTS.map(([l, v]) => (
            <Action
              key={l}
              title={`${l}${v === rollbackMs ? " ✓" : ""}`}
              onAction={() => setRollbackMs(v)}
            />
          ))}
        </ActionPanel.Submenu>
        <Action
          title="Reload from Server"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={reload}
        />
      </ActionPanel.Section>
    </>
  );

  return (
    <List
      navigationTitle={statusText ? `Config · ${statusText}` : "Config"}
      searchBarPlaceholder="Config sections…"
      actions={<ActionPanel>{renderPipeline()}</ActionPanel>}
    >
      <List.Section
        title="Configuration"
        subtitle={`auto-revert ${rollbackMs > 0 ? `${rollbackMs / 1000}s` : "off"}`}
      >
        {CONFIG_SECTIONS.map((s) => {
          const active = isActive(cfg, s);
          return (
            <List.Item
              key={s.id}
              icon={{
                source: SECTION_ICON[s.id] ?? Icon.Gear,
                tintColor: active ? Color.PrimaryText : Color.SecondaryText,
              }}
              title={s.title}
              subtitle={s.blurb}
              accessories={
                s.enable
                  ? [
                      {
                        tag: {
                          value: active ? "active" : "off",
                          color: active ? Color.Green : Color.SecondaryText,
                        },
                      },
                    ]
                  : undefined
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title={
                      s.kind === "deviceMap"
                        ? "Manage Devices"
                        : s.kind === "modules"
                          ? "Manage Modules"
                          : "Edit"
                    }
                    icon={Icon.Pencil}
                    target={
                      s.kind === "deviceMap" ? (
                        <DevicesScreen cfg={cfg} onChange={setCfg} />
                      ) : s.kind === "modules" ? (
                        <ModulesScreen cfg={cfg} onChange={setCfg} />
                      ) : (
                        <SectionScreen
                          cfg={cfg}
                          section={s}
                          onChange={setCfg}
                        />
                      )
                    }
                  />
                  {s.enable ? (
                    <Action
                      title={active ? "Deactivate" : "Activate"}
                      icon={active ? Icon.Circle : Icon.Checkmark}
                      onAction={() => toggleSection(s, !active)}
                    />
                  ) : null}
                  {renderPipeline()}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const cfg = useApi<Record<string, unknown>>("/api/config");
  // Remount the editor with a fresh key each time new server config arrives, so
  // "Reload from Server" / post-apply revalidation re-seed the working copy.
  const [gen, setGen] = useState(0);
  const lastData = useRef<unknown>(undefined);
  useEffect(() => {
    if (cfg.data && cfg.data !== lastData.current) {
      lastData.current = cfg.data;
      setGen((g) => g + 1);
    }
  }, [cfg.data]);

  if (!cfg.data) {
    return (
      <List
        isLoading={cfg.isLoading}
        navigationTitle="Config"
        actions={
          <ActionPanel>
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              onAction={cfg.revalidate}
            />
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.Gear}
          title={
            cfg.isLoading ? "Loading configuration…" : "Could not load config"
          }
          description={
            cfg.isLoading
              ? undefined
              : "Check the Dashboard URL / token in extension preferences."
          }
        />
      </List>
    );
  }

  return (
    <Editor
      key={gen}
      initial={cfg.data}
      reload={() => {
        lastData.current = undefined;
        cfg.revalidate();
      }}
    />
  );
}
