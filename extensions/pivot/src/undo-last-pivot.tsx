import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { setDefaultHandlersBatch } from "swift:../swift";
import { fetchAppMap } from "./lib/handlers";
import { LastOp, getLastOp, setLastOp } from "./lib/storage";

type PivotResult = { ext: string; ok: boolean; error: string | null };

export default function UndoLastPivot() {
  const [op, setOp] = useState<LastOp | null>(null);
  const [appNames, setAppNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    let alive = true;
    (async () => {
      const [last, { byBundleID }] = await Promise.all([getLastOp(), fetchAppMap()]);
      if (!alive) return;
      setOp(last);
      const names = new Map<string, string>();
      for (const [id, app] of byBundleID) names.set(id, app.name);
      setAppNames(names);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const apply = async () => {
    if (!op) return;
    const exts = Object.keys(op.previousHandlers);
    const ok = await confirmAlert({
      title: `Restore ${exts.length} extension${exts.length === 1 ? "" : "s"}?`,
      message: `Reverts the pivot to ${op.targetName}. Extensions with no prior handler can't be reset to system default and will be skipped.`,
      primaryAction: { title: "Restore", style: Alert.ActionStyle.Default },
    });
    if (!ok) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Restoring previous handlers…",
    });
    const pairs = exts.map((ext) => ({
      ext,
      bundleID: op.previousHandlers[ext] ?? null,
    }));
    const results = (await setDefaultHandlersBatch(pairs)) as PivotResult[];
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);
    const retriable = failures.filter((f) => op.previousHandlers[f.ext] != null);

    if (retriable.length === 0) {
      await setLastOp(null);
    } else {
      const remaining: Record<string, string | null> = {};
      for (const f of retriable) remaining[f.ext] = op.previousHandlers[f.ext];
      await setLastOp({ ...op, previousHandlers: remaining });
    }

    toast.style = failures.length === 0 ? Toast.Style.Success : Toast.Style.Failure;
    toast.title =
      failures.length === 0
        ? `Restored ${successes.length} extensions`
        : `Restored ${successes.length} / ${results.length}`;
    if (failures.length > 0) {
      toast.message = failures.map((f) => `.${f.ext}: ${f.error ?? "error"}`).join(", ");
    }
    pop();
  };

  if (loading) return <Detail isLoading={true} markdown="" />;

  if (!op) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clock}
          title="Nothing to undo"
          description="Run Pivot Apps first to make a change you can undo."
        />
      </List>
    );
  }

  const exts = Object.keys(op.previousHandlers).sort();
  const when = new Date(op.timestamp).toLocaleString();

  return (
    <List
      navigationTitle="Undo Last Pivot"
      searchBarPlaceholder="Filter extensions"
      actions={
        <ActionPanel>
          <Action title="Restore Previous Handlers" icon={Icon.RotateAntiClockwise} onAction={apply} />
        </ActionPanel>
      }
    >
      <List.Section title={`Pivoted to ${op.targetName} — ${when}`}>
        {exts.map((ext) => {
          const prev = op.previousHandlers[ext];
          const prevName = prev ? (appNames.get(prev.toLowerCase()) ?? prev) : "no prior handler";
          return (
            <List.Item
              key={ext}
              title={`.${ext}`}
              subtitle={`→ ${prevName}`}
              icon={prev ? Icon.RotateAntiClockwise : Icon.MinusCircle}
              actions={
                <ActionPanel>
                  <Action title="Restore Previous Handlers" icon={Icon.RotateAntiClockwise} onAction={apply} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
