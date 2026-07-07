/**
 * Drift Guard command — mirrors the dashboard's Drift tab: golden-config
 * baselines and live drift detection. Fleet status, per-device "check now" (runs
 * a live `/export` and diffs vs baseline), and baseline set/promote/remove.
 * Removing a baseline is destructive.
 */
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
import { usePromise } from "@raycast/utils";
import { api, deleteJson, postJson } from "./lib/api";
import { diffMarkdown } from "./lib/diff";
import { confirmDestructive, showFailureToast } from "./lib/confirm";
import { bytes } from "./lib/format";
import { useApi, usePolling } from "./lib/hooks";
import { chartImage, diffBars } from "./lib/charts";
import type {
  DriftBaseline,
  DriftDeviceStatus,
  DriftReport,
  SnapshotMeta,
} from "./lib/types";

const STATUS: Record<
  DriftDeviceStatus["status"],
  { color: Color; label: string }
> = {
  "in-sync": { color: Color.Green, label: "in sync" },
  drifted: { color: Color.Red, label: "drifted" },
  unknown: { color: Color.Yellow, label: "unknown" },
  "no-baseline": { color: Color.SecondaryText, label: "no baseline" },
};

function CheckView({ device }: { device: string }) {
  const { data, isLoading } = usePromise(
    (d: string) =>
      api<DriftReport | { error: string }>(
        `/api/drift/check/${encodeURIComponent(d)}`,
      ),
    [device],
  );
  const report = data && !("error" in data) ? (data as DriftReport) : undefined;
  const err = data && "error" in data ? data.error : undefined;

  let md: string;
  if (err) md = `# Error\n\n${err}`;
  else if (!report) md = "Checking…";
  else {
    const sectionChart = report.sections.length
      ? chartImage(
          diffBars(
            report.sections.slice(0, 15).map((s) => ({
              label: s.path,
              added: s.added,
              removed: s.removed,
            })),
          ),
          "sections",
        )
      : "";
    const attrs = report.attributions.length
      ? `\n## Attribution\n\n${report.attributions
          .map(
            (a) =>
              `- ${a.timestamp ?? ""} ${a.user ?? ""} ${a.action ?? ""} — ${a.section}`,
          )
          .join("\n")}`
      : "";
    md = [
      `# ${report.device} · ${report.identical ? "in sync" : "drifted"} (score ${report.score}/100)`,
      ``,
      `+${report.summary.added} / −${report.summary.removed} · ${report.summary.unchanged} unchanged`,
      sectionChart ? `\n### Sections\n\n${sectionChart}` : "",
      attrs,
      report.unified ? `\n## Diff\n\n${diffMarkdown(report.unified)}` : "",
    ].join("\n");
  }
  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      navigationTitle={`Drift · ${device}`}
    />
  );
}

function SetBaselineForm({
  device,
  onDone,
}: {
  device: string;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  const { data, isLoading } = useApi<{ snapshots: SnapshotMeta[] }>(
    `/api/drift/history/${encodeURIComponent(device)}?limit=20`,
  );
  const snapshots = data?.snapshots ?? [];
  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Set baseline · ${device}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Baseline"
            onSubmit={async (v: { snapshotId: string; label: string }) => {
              if (!v.snapshotId) {
                await showFailureToast(new Error("Pick a snapshot"), {
                  title: "No snapshot",
                });
                return;
              }
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Setting baseline…",
              });
              try {
                const res = await postJson<{ ok?: boolean; error?: string }>(
                  "/api/drift/baseline",
                  {
                    device,
                    snapshotId: v.snapshotId,
                    label: v.label || undefined,
                  },
                );
                if (res.error) throw new Error(res.error);
                toast.style = Toast.Style.Success;
                toast.title = "Baseline set";
                onDone();
                pop();
              } catch (e) {
                toast.hide();
                await showFailureToast(e, { title: "Could not set baseline" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="snapshotId" title="Snapshot">
        {snapshots.map((s) => (
          <Form.Dropdown.Item
            key={s.id}
            value={s.id}
            title={`${s.label || s.id.slice(0, 10)} · ${new Date(s.ts).toLocaleString()} · ${s.lines} lines`}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="label" title="Label" placeholder="golden" />
    </Form>
  );
}

export default function Command() {
  const status = useApi<{ devices: DriftDeviceStatus[] }>("/api/drift/status");
  const baselines = useApi<{ baselines: DriftBaseline[] }>(
    "/api/drift/baselines",
  );
  usePolling(status.revalidate, 15000);

  async function removeBaseline(device: string) {
    const ok = await confirmDestructive({
      title: `Remove baseline for ${device}?`,
      message:
        "Drift detection will report no baseline until you set a new one.",
      actionTitle: "Remove",
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing baseline…",
    });
    try {
      const res = await deleteJson<{ ok?: boolean; error?: string }>(
        `/api/drift/baseline/${encodeURIComponent(device)}`,
        {},
      );
      if (res.error) throw new Error(res.error);
      toast.style = Toast.Style.Success;
      toast.title = "Baseline removed";
      status.revalidate();
      baselines.revalidate();
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: "Could not remove baseline" });
    }
  }

  const devices = status.data?.devices ?? [];
  const bl = baselines.data?.baselines ?? [];

  return (
    <List isLoading={status.isLoading} searchBarPlaceholder="Filter devices…">
      <List.Section title="Fleet" subtitle={`${devices.length}`}>
        {devices.map((d) => {
          const st = STATUS[d.status];
          return (
            <List.Item
              key={d.device}
              icon={{ source: Icon.Dot, tintColor: st.color }}
              title={d.device}
              subtitle={
                d.baseline?.label ??
                (d.baseline ? "baseline set" : "no baseline")
              }
              accessories={[{ tag: { value: st.label, color: st.color } }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Check Now"
                    icon={Icon.MagnifyingGlass}
                    target={<CheckView device={d.device} />}
                  />
                  <Action.Push
                    title="Set Baseline…"
                    icon={Icon.Flag}
                    target={
                      <SetBaselineForm
                        device={d.device}
                        onDone={() => {
                          status.revalidate();
                          baselines.revalidate();
                        }}
                      />
                    }
                  />
                  {d.baseline ? (
                    <Action
                      title="Remove Baseline"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => removeBaseline(d.device)}
                    />
                  ) : null}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={status.revalidate}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Baselines" subtitle={`${bl.length}`}>
        {bl.map((b) => (
          <List.Item
            key={b.device}
            icon={Icon.Flag}
            title={b.device}
            subtitle={b.label ?? b.snapshotId.slice(0, 10)}
            accessories={[
              ...(b.snapshot
                ? [
                    { text: `${b.snapshot.lines} lines` },
                    { text: bytes(b.snapshot.bytes) },
                  ]
                : []),
              { date: new Date(b.setAt) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Check Now"
                  icon={Icon.MagnifyingGlass}
                  target={<CheckView device={b.device} />}
                />
                <Action
                  title="Remove Baseline"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => removeBaseline(b.device)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
