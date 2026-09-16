import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { bytes, entities, markdownText } from "./model";
import { getSnapshot, historyStore, prepare } from "./runtime";
import { HistoryRow } from "./storage";
import { ResourceDetail } from "./ui";
function duration(value: number | null) {
  return value == null ? "Unavailable" : `${(value / 60).toFixed(1)} min`;
}
function HistoryDetail({ row }: { row: HistoryRow }) {
  const { push } = useNavigation();
  async function findCurrent() {
    try {
      const snapshot = await getSnapshot(),
        found = entities(snapshot).find((e) => e.key === row.key);
      if (!found) {
        await showToast({
          style: Toast.Style.Success,
          title: "This target is not currently running",
        });
        return;
      }
      push(<ResourceDetail selected={found} selectedSnapshot={snapshot} />);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read current usage",
        message: String(e),
      });
    }
  }
  return (
    <Detail
      markdown={`# ${markdownText(row.name)}\n\nRecorded ${row.kind} history, from ${row.count} samples.\n\n| Measurement | Observed |\n|---|---|\n| Average memory | ${bytes(row.average)} |\n| Peak memory | ${bytes(row.peak)} |\n| CPU time | ${duration(row.cpu)} |\n| Disk read | ${bytes(row.reads)} |\n| Disk written | ${bytes(row.writes)} |\n| Covered time | ${duration(row.observed)} |\n\nAverages cover measured intervals only. Short-lived processes between samples can be missed. Missing and sleeping periods are not filled in. Older data is summarized by hour.\n\n${row.kind === "container" ? "Container CPU time is an estimate from sampled CPU percentages. Container memory is separate from, and overlaps, OrbStack’s host memory." : "App totals include their associated processes; do not add app totals and process totals together."}\n\nHistorical entries cannot directly stop a process. Inspect the current target first.`}
      actions={
        <ActionPanel>
          <Action
            title="Inspect Current Target"
            icon={Icon.Eye}
            onAction={findCurrent}
          />
        </ActionPanel>
      }
    />
  );
}
export default function History() {
  const [days, setDays] = useState("1"),
    [kind, setKind] = useState("app"),
    [sort, setSort] = useState("peak");
  const [rows, setRows] = useState<HistoryRow[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string>();
  const [coverage, setCoverage] = useState("No samples yet"),
    [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      await prepare();
      const since = Date.now() / 1000 - Number(days) * 86400;
      const [data, covered, paused] = await Promise.all([
        historyStore.history(since, kind),
        historyStore.coverage(since),
        historyStore.meta("paused"),
      ]);
      if (!active) return;
      setRows(data);
      setError(undefined);
      setCoverage(
        `${paused === "true" ? "Paused · " : ""}${covered.count} samples · ${duration(covered.seconds ?? 0)} covered of ${Number(days) * 24} hours${covered.last ? ` · latest ${new Date(covered.last * 1000).toLocaleString()}` : ""}`,
      );
    })()
      .catch((e) => {
        if (active) setError(String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days, kind, tick]);
  const score = (r: HistoryRow) =>
    sort === "cpu"
      ? (r.cpu ?? -1)
      : sort === "writes"
        ? (r.writes ?? -1)
        : sort === "average"
          ? (r.average ?? -1)
          : (r.peak ?? -1);
  return (
    <List
      isLoading={loading}
      navigationTitle="Usage History"
      searchBarPlaceholder="Search recorded resources"
      searchBarAccessory={
        <List.Dropdown tooltip="Time Range" value={days} onChange={setDays}>
          <List.Dropdown.Item title="Last 24 Hours" value="1" />
          <List.Dropdown.Item title="Last 3 Days" value="3" />
          <List.Dropdown.Item title="Last 7 Days" value="7" />
        </List.Dropdown>
      }
    >
      <List.Section title={coverage}>
        <List.Item
          title={`${kind === "app" ? "Apps" : kind === "process" ? "Processes" : "Containers"} · sorted by ${sort}`}
          icon={Icon.Filter}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Resource Type">
                {["app", "process", "container"].map((k) => (
                  <Action
                    key={k}
                    title={`Show ${k === "app" ? "Apps" : k === "process" ? "Processes" : "Containers"}`}
                    onAction={() => setKind(k)}
                  />
                ))}
              </ActionPanel.Section>
              <ActionPanel.Section title="Rank By">
                {["peak", "average", "cpu", "writes"].map((s) => (
                  <Action
                    key={s}
                    title={`Sort by ${s === "cpu" ? "CPU Time" : s === "writes" ? "Disk Writes" : `${s === "peak" ? "Peak" : "Average"} Memory`}`}
                    onAction={() => setSort(s)}
                  />
                ))}
              </ActionPanel.Section>
              <Action
                title="Refresh History"
                icon={Icon.ArrowClockwise}
                onAction={() => setTick((t) => t + 1)}
              />
            </ActionPanel>
          }
        />
        {error && (
          <List.Item
            title="History unavailable"
            subtitle={error}
            icon={Icon.ExclamationMark}
          />
        )}
        {!loading && !rows.length && !error && (
          <List.Item
            title="History starts with your first recorded sample"
            subtitle="Run Record Resource Usage; past events are in Recent Diagnostics"
            icon={Icon.Info}
          />
        )}
      </List.Section>
      <List.Section title="Measured intervals only · older than 24 hours summarized hourly">
        {[...rows]
          .sort((a, b) => score(b) - score(a))
          .map((row) => (
            <List.Item
              key={row.key}
              title={row.name}
              subtitle={
                kind === "process"
                  ? `PID ${row.key.split(":")[2] ?? ""}`
                  : undefined
              }
              icon={kind === "container" ? Icon.Box : Icon.BarChart}
              accessories={[
                { text: `Peak ${bytes(row.peak)}` },
                { text: `CPU ${duration(row.cpu)}` },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Inspect Recorded History"
                    icon={Icon.Eye}
                    target={<HistoryDetail row={row} />}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
