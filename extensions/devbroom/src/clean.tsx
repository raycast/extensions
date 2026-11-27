import { useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { clean, CleanReport, folder, gb, openLink, preview, Progress, STAGES } from "./devbroom";

type Planned = CleanReport["planned"][number];

/** What the running scan has said so far. */
interface Live {
  stage: string;
  done: number;
  total: number;
  found: { path: string; bytes: number }[];
}

const NOTHING = { gone: new Set<string>(), left: [] };

const START: Live = { stage: "agents", done: 0, total: 0, found: [] };

function heard(live: Live, p: Progress): Live {
  if ("stage" in p) return { ...live, stage: p.stage };
  if ("found" in p) {
    const { path, bytes, ready, done, total } = p.found;
    return { ...live, done, total, found: ready ? [...live.found, { path, bytes }] : live.found };
  }
  return live;
}

const GROUPS: { kind: string; title: string; icon: Icon }[] = [
  { kind: "artifact", title: "Build Folders", icon: Icon.Hammer },
  { kind: "cache", title: "Caches", icon: Icon.HardDrive },
  { kind: "scratch", title: "Scratch", icon: Icon.Document },
  { kind: "worktree", title: "Worktrees", icon: Icon.Tree },
];

function name(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function items(n: number): string {
  return n === 1 ? "1 item" : `${n} items`;
}

/** What happened, in one toast. */
function report(done: CleanReport, asked: string[], forGood: boolean): Toast.Options {
  const ok = done.outcomes.filter((o) => o.status === "succeeded");
  const failed = done.outcomes.filter((o) => o.status !== "succeeded");
  const skipped = done.left_out.filter((l) => asked.includes(l.path));
  const bytes = done.planned.filter((p) => ok.some((o) => o.target === p.path)).reduce((s, p) => s + p.bytes, 0);
  const verb = forGood ? "Deleted" : "Moved to the Trash";
  const notes = [
    ...failed.map((f) => `${name(f.target)}: ${f.message}`),
    ...skipped.map((l) => `${name(l.path)}: ${l.why}`),
  ];
  return {
    style: ok.length === 0 ? Toast.Style.Failure : Toast.Style.Success,
    title: ok.length ? `${verb}: ${items(ok.length)}, ${gb(bytes)}` : "Nothing was cleaned",
    message: notes.length
      ? `${notes.length} left: ${notes.slice(0, 3).join("; ")}`
      : forGood
        ? undefined
        : "Put things back from the Trash or Devbroom's History",
  };
}

export default function Command() {
  return <CleanView />;
}

/** The clean list; a title only when pushed from another command. */
export function CleanView({ navigationTitle }: { navigationTitle?: string }) {
  const abortable = useRef<AbortController>(null);
  const [live, setLive] = useState<Live>(START);
  // After a cleanup the scan is kept, like in the app: what was cleaned drops
  // out, what was not moves to Left Out. Only Scan Again scans anew.
  const [after, setAfter] = useState<{ gone: Set<string>; left: { path: string; why: string }[] }>(NOTHING);
  const { data, isLoading, error, revalidate } = usePromise(
    () => {
      setLive(START);
      setAfter(NOTHING);
      return preview({
        signal: abortable.current?.signal,
        onProgress: (p) => setLive((l) => heard(l, p)),
      });
    },
    [],
    { abortable },
  );
  // Unticked paths; everything starts ticked, like the app's clean sheet.
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const planned = useMemo(
    () => (data?.planned ?? []).filter((p) => !after.gone.has(p.path) && !after.left.some((l) => l.path === p.path)),
    [data, after],
  );
  const leftOut = [...after.left, ...(data?.left_out ?? [])];
  const chosen = useMemo(() => planned.filter((p) => !skipped.has(p.path)), [planned, skipped]);
  const chosenBytes = chosen.reduce((s, p) => s + p.bytes, 0);
  const mayDelete = data?.delete_allowed === true;
  const onlyFolders = chosen.every((p) => p.method === "trash");

  function toggle(path: string) {
    setSkipped((s) => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function run(forGood: boolean) {
    if (chosen.length === 0 || busy) return;
    const confirmed = await confirmAlert({
      title: forGood
        ? `Delete ${items(chosen.length)}, ${gb(chosenBytes)} for good?`
        : `Clean ${items(chosen.length)}, ${gb(chosenBytes)}?`,
      message: forGood
        ? onlyFolders
          ? "They do not go to the Trash and can't be put back."
          : "Folders do not go to the Trash and can't be put back; worktrees are removed with git, never forced."
        : "Folders go to the Trash; worktrees are removed with git, never forced. Devbroom checks each one again first.",
      icon: forGood ? { source: Icon.Trash, tintColor: Color.Red } : Icon.Trash,
      primaryAction: {
        title: forGood ? "Delete for Good" : "Clean",
        style: forGood ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) return;
    setBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Cleaning",
      message: "Devbroom scans again first",
    });
    const asked = chosen.map((p) => p.path);
    try {
      const done = await clean(asked, forGood, {
        onProgress: (p) => {
          if ("stage" in p) toast.message = `Checking again: ${STAGES[p.stage] ?? p.stage}`;
          else if ("cleaning" in p) {
            const { path, done, total } = p.cleaning;
            toast.message = `${done + 1} of ${total}: ${name(path)}`;
          }
        },
      });
      Object.assign(toast, report(done, asked, forGood));
      const ok = done.outcomes.filter((o) => o.status === "succeeded").map((o) => o.target);
      const notDone = [
        ...done.outcomes.filter((o) => o.status !== "succeeded").map((o) => ({ path: o.target, why: o.message })),
        ...done.left_out.filter((l) => asked.includes(l.path)),
      ];
      setAfter((a) => ({ gone: new Set([...a.gone, ...ok]), left: [...notDone, ...a.left] }));
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Nothing was cleaned";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setBusy(false);
    }
  }

  function CleanActions() {
    return (
      <>
        <Action
          title={`Clean Selected (${gb(chosenBytes)})`}
          icon={Icon.Trash}
          shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
          onAction={() => run(false)}
        />
        {mayDelete && (
          <Action
            title="Delete for Good"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={() => run(true)}
          />
        )}
      </>
    );
  }

  function CommonActions() {
    return (
      <>
        <Action
          title="Select All"
          icon={Icon.CheckCircle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={() => setSkipped(new Set())}
        />
        <Action
          title="Select None"
          icon={Icon.Circle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          onAction={() => setSkipped(new Set(planned.map((p) => p.path)))}
        />
        <ScanAgain />
        <Action title="Open Devbroom" icon={Icon.AppWindow} onAction={() => openLink("open", "storage")} />
      </>
    );
  }

  function ScanAgain() {
    return (
      <Action
        title="Scan Again"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    );
  }

  function PathActions({ path }: { path: string }) {
    return (
      <ActionPanel.Section>
        <Action.ShowInFinder path={path} />
        <Action.CopyToClipboard title="Copy Path" content={path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
      </ActionPanel.Section>
    );
  }

  function PlannedItem({ p, icon }: { p: Planned; icon: Icon }) {
    const on = !skipped.has(p.path);
    return (
      <List.Item
        icon={on ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
        title={name(p.path)}
        subtitle={folder(p.path)}
        keywords={[p.path]}
        accessories={[...(p.method === "trash" ? [] : [{ tag: p.method }]), { icon, text: gb(p.bytes) }]}
        actions={
          <ActionPanel>
            <Action
              title={on ? "Skip" : "Include"}
              icon={on ? Icon.Circle : Icon.CheckCircle}
              onAction={() => toggle(p.path)}
            />
            <PathActions path={p.path} />
            <ActionPanel.Section>
              <CleanActions />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <CommonActions />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  if (error) {
    return (
      <List navigationTitle={navigationTitle}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Devbroom couldn't be asked"
          description={`${error.message}. Link the command in Devbroom: Settings, Integrations.`}
          actions={
            <ActionPanel>
              <ScanAgain />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Open Devbroom" icon={Icon.AppWindow} onAction={() => openLink("open", "storage")} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // While scanning: the stage, the count, and what is Ready so far.
  if (isLoading && !busy) {
    const soFar = [...live.found].sort((a, b) => b.bytes - a.bytes);
    const bytes = soFar.reduce((s, f) => s + f.bytes, 0);
    return (
      <List isLoading navigationTitle={navigationTitle} searchBarPlaceholder="Filter what is Ready">
        <List.Section title="Scanning">
          <List.Item
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
            title={`${STAGES[live.stage] ?? live.stage}...`}
            subtitle={live.total ? `${live.done} of ${live.total} checked` : undefined}
            accessories={[{ text: `${gb(bytes)} ready so far` }]}
            actions={
              <ActionPanel>
                <Action title="Open Devbroom" icon={Icon.AppWindow} onAction={() => openLink("open", "storage")} />
              </ActionPanel>
            }
          />
        </List.Section>
        {soFar.length > 0 && (
          <List.Section title="Ready So Far" subtitle="You can choose once the scan is done">
            {soFar.slice(0, 100).map((f) => (
              <List.Item
                key={f.path}
                icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
                title={name(f.path)}
                subtitle={folder(f.path)}
                keywords={[f.path]}
                accessories={[{ text: gb(f.bytes) }]}
                actions={
                  <ActionPanel>
                    <PathActions path={f.path} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}
      </List>
    );
  }

  const known = new Set(GROUPS.map((g) => g.kind));
  const groups = [...GROUPS, { kind: "", title: "Other", icon: Icon.Folder }].map((g) => ({
    ...g,
    rows: planned.filter((p) => (g.kind ? p.kind === g.kind : !known.has(p.kind ?? ""))),
  }));

  return (
    <List isLoading={isLoading || busy} navigationTitle={navigationTitle} searchBarPlaceholder="Filter what is Ready">
      {data && planned.length === 0 && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="Nothing is ready to clean"
          description={data.to_review.length ? `${items(data.to_review.length)} to review in Devbroom` : undefined}
          actions={
            <ActionPanel>
              <CommonActions />
            </ActionPanel>
          }
        />
      )}
      {groups
        .filter((g) => g.rows.length > 0)
        .map((g) => (
          <List.Section
            key={g.title}
            title={g.title}
            subtitle={gb(g.rows.filter((p) => !skipped.has(p.path)).reduce((s, p) => s + p.bytes, 0))}
          >
            {g.rows.map((p) => (
              <PlannedItem key={p.path} p={p} icon={g.icon} />
            ))}
          </List.Section>
        ))}
      {data && leftOut.length > 0 && (
        <List.Section title="Left Out" subtitle="Clean these in Devbroom">
          {leftOut.map((l) => (
            <List.Item
              key={l.path}
              icon={{ source: Icon.MinusCircle, tintColor: Color.SecondaryText }}
              title={name(l.path)}
              subtitle={l.why}
              keywords={[l.path]}
              actions={
                <ActionPanel>
                  <Action title="Open Devbroom" icon={Icon.AppWindow} onAction={() => openLink("open", "storage")} />
                  <PathActions path={l.path} />
                  <ActionPanel.Section>
                    <ScanAgain />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {data && data.to_review.length > 0 && (
        <List.Section title="To Review in Devbroom">
          {data.to_review.map((l) => (
            <List.Item
              key={l.path}
              icon={{ source: Icon.Eye, tintColor: Color.Orange }}
              title={name(l.path)}
              subtitle={l.why}
              keywords={[l.path]}
              actions={
                <ActionPanel>
                  <Action
                    title="Review in Devbroom"
                    icon={Icon.AppWindow}
                    onAction={() => openLink("open", "worktrees")}
                  />
                  {!l.path.startsWith("git:") && <PathActions path={l.path} />}
                  <ActionPanel.Section>
                    <ScanAgain />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
