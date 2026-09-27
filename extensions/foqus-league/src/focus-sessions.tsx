import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { writeFile } from "node:fs/promises";
import * as path from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDayLong, formatDuration, formatTime, pluralize, truncate } from "./lib/format.ts";
import { ImportForm } from "./lib/ImportForm.tsx";
import { SessionForm } from "./lib/SessionForm.tsx";
import { store } from "./lib/runtime.ts";
import { DOWNLOADS, freePath } from "./lib/shareImage.ts";
import { UNLABELLED } from "./lib/stats.ts";
import { dayKey } from "./lib/streaks.ts";
import { statusNotes } from "./lib/statusNotes.ts";
import { exportFilename, serializeSessions } from "./lib/transfer.ts";
import { useStats } from "./lib/useStats.ts";
import type { Session } from "./lib/types.ts";

const ALL_GOALS = "__all__";

const NOTES_PREVIEW = 60;

type Context = { add?: boolean };

function sessionAccessories(session: Session): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (session.notes) {
    accessories.push({ text: truncate(session.notes, NOTES_PREVIEW), tooltip: session.notes });
  }
  if (session.source === "manual") {
    accessories.push({ icon: Icon.Pencil, tooltip: "Logged manually" });
  }
  if (session.blocks) {
    const sites = Object.entries(session.sites ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name} ×${count}`)
      .join(", ");
    accessories.push({
      icon: Icon.CircleDisabled,
      text: String(session.blocks),
      tooltip: sites || `${pluralize(session.blocks, "distraction")} blocked`,
    });
  }
  if (session.pauses) {
    accessories.push({ icon: Icon.Pause, text: String(session.pauses), tooltip: pluralize(session.pauses, "pause") });
  }

  accessories.push({
    text: formatDuration(session.duration),
    tooltip: session.planned ? `${formatDuration(session.planned)} planned` : undefined,
  });
  return accessories;
}

export default function FocusSessions({ launchContext }: LaunchProps<{ launchContext?: Context }>) {
  const { data, isLoading, revalidate } = useStats();
  const [goalFilter, setGoalFilter] = useState(ALL_GOALS);
  const { push } = useNavigation();
  const opened = useRef(false);

  const grouped = useMemo(() => {
    if (!data) return [];
    const filtered =
      goalFilter === ALL_GOALS
        ? data.sessions
        : data.sessions.filter((s) => (s.goal.trim() || UNLABELLED) === goalFilter);

    const byDay = new Map<string, typeof filtered>();
    for (const s of [...filtered].sort((a, b) => b.start - a.start)) {
      const key = dayKey(new Date(s.start));
      const bucket = byDay.get(key) ?? [];
      bucket.push(s);
      byDay.set(key, bucket);
    }
    return [...byDay.entries()];
  }, [data, goalFilter]);

  const empty = data?.totalOnRecord === 0 && !isLoading;
  const trouble = data?.syncError || empty ? statusNotes(data, isLoading)[0] : undefined;
  const goalNames = useMemo(() => (data?.stats.goals ?? []).map((g) => g.name), [data]);
  const addAction = (
    <Action.Push
      title="Add Session"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<SessionForm goals={goalNames} onDone={revalidate} />}
    />
  );

  const exportSessions = async () => {
    try {
      const sessions = await store.all();
      if (!sessions.length) {
        await showToast({ style: Toast.Style.Failure, title: "Nothing to export yet" });
        return;
      }
      const file = await freePath(DOWNLOADS, exportFilename());
      await writeFile(file, serializeSessions(sessions), "utf8");
      await showToast({
        style: Toast.Style.Success,
        title: `Exported ${pluralize(sessions.length, "session")}`,
        message: path.basename(file),
        primaryAction: { title: "Show in Finder", onAction: () => showInFinder(file) },
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Export" });
    }
  };

  const transferActions = (
    <ActionPanel.Section title="Transfer">
      <Action
        title="Export Sessions"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        onAction={exportSessions}
      />
      <Action.Push
        title="Import Sessions"
        icon={Icon.Upload}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        target={<ImportForm onDone={revalidate} />}
      />
    </ActionPanel.Section>
  );

  useEffect(() => {
    if (!launchContext?.add || !data || opened.current) return;
    opened.current = true;
    push(<SessionForm goals={goalNames} onDone={revalidate} />);
  }, [launchContext, data, goalNames, push, revalidate]);

  const deleteSession = async (session: Session, goal: string) => {
    const confirmed = await confirmAlert({
      title: "Delete this session?",
      message: `${goal}, ${formatDuration(session.duration)} on ${formatDayLong(session.start)}. This cannot be undone.`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await store.remove(session.start);
    await showToast({ style: Toast.Style.Success, title: "Session Deleted" });
    revalidate();
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sessions"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by goal" value={goalFilter} onChange={setGoalFilter}>
          <List.Dropdown.Item title="All goals" value={ALL_GOALS} />
          {(data?.stats.goals ?? []).map((g) => (
            <List.Dropdown.Item key={g.name} title={`${g.name} · ${formatDuration(g.minutes)}`} value={g.name} />
          ))}
        </List.Dropdown>
      }
    >
      {grouped.map(([day, sessions]) => {
        const dayTotal = sessions.reduce((a, s) => a + s.duration, 0);
        return (
          <List.Section
            key={day}
            title={formatDayLong(day)}
            subtitle={`${formatDuration(dayTotal)} · ${pluralize(sessions.length, "session")}`}
          >
            {sessions.map((session) => {
              const goal = session.goal.trim() || UNLABELLED;
              return (
                <List.Item
                  key={session.start}
                  title={goal}
                  subtitle={formatTime(session.start)}
                  accessories={sessionAccessories(session)}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.Push
                          title="Edit Session"
                          icon={Icon.Pencil}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          target={<SessionForm session={session} goals={goalNames} onDone={revalidate} />}
                        />
                        {addAction}
                        <Action
                          title="Delete Session"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={() => deleteSession(session, goal)}
                        />
                      </ActionPanel.Section>
                      {transferActions}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
      <List.EmptyView
        icon={trouble ? (trouble.kind === "empty" ? Icon.Stopwatch : Icon.Warning) : Icon.MagnifyingGlass}
        title={trouble ? trouble.title : "No sessions match"}
        description={trouble ? trouble.body : "Try another goal, or add one by hand."}
        actions={
          <ActionPanel>
            {addAction}
            {transferActions}
          </ActionPanel>
        }
      />
    </List>
  );
}
