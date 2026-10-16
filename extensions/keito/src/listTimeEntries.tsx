import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { KeitoGate } from "./components/KeitoGate";
import { OpenKeitoAction } from "./components/OpenKeitoAction";
import { approvalLabel, enrichEntry, entryEditability } from "./services/keito/normalize";
import { ResolvedSession } from "./services/keito/session";
import { TimeEntry } from "./services/keito/types";
import { restartEntry, startTimer, StartResult } from "./services/keito/workflows";
import { primaryShortcut } from "./shortcuts";
import {
  confirmReplaceRunning,
  formatHours,
  getApi,
  getKeitoPreferences,
  refreshMenuBar,
  showKeitoError,
  todayString,
  useProjects,
  useTimeEntries,
} from "./services/useKeito";
import { EntryForm } from "./new";

type SortBy = "updated-desc" | "updated-asc" | "created-desc" | "created-asc" | "none";

export function sortEntries(entries: TimeEntry[], sortBy: SortBy): TimeEntry[] {
  if (sortBy === "none") return entries;
  const field = sortBy.startsWith("updated") ? "updatedAt" : "createdAt";
  const direction = sortBy.endsWith("desc") ? -1 : 1;
  return [...entries].sort((a, b) => {
    const diff = Date.parse(a[field] ?? "") - Date.parse(b[field] ?? "");
    if (diff === 0 || Number.isNaN(diff)) return a.isRunning === b.isRunning ? 0 : a.isRunning ? -1 : 1;
    return diff * direction;
  });
}

function dayTitle(date: string, todayDate: string): string {
  const day = dayjs(date);
  const today = dayjs(todayDate);
  if (day.isSame(today, "day")) return "Today's Timesheet";
  if (day.isSame(today.subtract(1, "day"), "day")) return "Yesterday's Timesheet";
  if (day.isSame(today.add(1, "day"), "day")) return "Tomorrow's Timesheet";
  return day.format("ddd, MMM D");
}

function Timesheet({ session }: { session: ResolvedSession }) {
  const [date, setDate] = useState(todayString(session));
  const { data, isLoading, revalidate } = useTimeEntries(session, date);
  const { byId } = useProjects(session.scope);
  const { sortBy = "updated-desc", titleDisplay = "project" } = getKeitoPreferences() as {
    sortBy?: SortBy;
    titleDisplay?: "project" | "task";
  };
  const isToday = date === todayString(session);
  const title = dayTitle(date, todayString(session));

  const entries = useMemo(
    () =>
      sortEntries(
        data.map((e) => enrichEntry(e, byId)),
        sortBy,
      ),
    [data, byId, sortBy],
  );
  const total = useMemo(() => entries.reduce((sum, e) => sum + e.hours, 0), [entries]);

  async function afterChange() {
    revalidate();
    await refreshMenuBar();
  }

  const ctx = () => ({
    api: getApi(),
    userId: session.identity.userId,
    lookup: { projects: byId },
    confirmReplace: confirmReplaceRunning,
  });

  async function runStart(label: string, start: () => Promise<StartResult>) {
    const toast = await showToast({ style: Toast.Style.Animated, title: label });
    try {
      const result = await start();
      await toast.hide();
      if (result.status === "started") await showHUD(result.replaced ? "Switched Timer" : "Timer Started");
      await afterChange();
      return result;
    } catch (error) {
      await toast.hide();
      await showKeitoError(error, "Could not start the timer");
    }
  }

  async function stop(entry: TimeEntry) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping timer…" });
    try {
      await getApi().stopTimeEntry(entry.id);
      await toast.hide();
      await showHUD("Timer Stopped");
      await afterChange();
    } catch (error) {
      await toast.hide();
      await showKeitoError(error, "Could not stop the timer");
    }
  }

  async function remove(entry: TimeEntry) {
    const confirmed = await confirmAlert({
      title: "Delete Time Entry?",
      message: `${entry.projectName} – ${entry.taskName}, ${formatHours(entry.hours)}. This cannot be undone.`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting…" });
    try {
      await getApi().deleteTimeEntry(entry.id);
      toast.style = Toast.Style.Success;
      toast.title = "Time entry deleted";
      await afterChange();
    } catch (error) {
      await toast.hide();
      await showKeitoError(error, "Could not delete the time entry");
    }
  }

  function changeDate(days: number | "today") {
    setDate(days === "today" ? todayString(session) : dayjs(date).add(days, "day").format("YYYY-MM-DD"));
  }

  const commonActions = (
    <>
      <ActionPanel.Section title="Keito">
        <Action.Push
          title="New Time Entry"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<EntryForm session={session} viewDate={dayjs(date).toDate()} onSave={afterChange} />}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={afterChange}
        />
        <OpenKeitoAction />
      </ActionPanel.Section>
      <ActionPanel.Section title="Change Dates">
        <Action
          title="Previous Day"
          icon={Icon.ArrowLeft}
          shortcut={primaryShortcut("arrowLeft")}
          onAction={() => changeDate(-1)}
        />
        <Action
          title="Next Day"
          icon={Icon.ArrowRight}
          shortcut={primaryShortcut("arrowRight")}
          onAction={() => changeDate(1)}
        />
        {!isToday && (
          <Action
            title="Back to Today"
            icon={Icon.Calendar}
            shortcut={primaryShortcut("t")}
            onAction={() => changeDate("today")}
          />
        )}
      </ActionPanel.Section>
    </>
  );

  return (
    <List
      searchBarPlaceholder="Filter time entries"
      isLoading={isLoading}
      actions={<ActionPanel>{commonActions}</ActionPanel>}
    >
      <List.EmptyView
        icon={Icon.Clock}
        title={isLoading ? "Loading…" : "No time entries"}
        description={isLoading ? undefined : "Press ⌘N to start a timer or log time. Use ⌘← and ⌘→ to change days."}
      />
      <List.Section title={title} subtitle={formatHours(total)}>
        {entries.map((entry) => {
          const lock = entryEditability(entry);
          const approval = approvalLabel(entry.approvalStatus);
          const other = titleDisplay === "task" ? entry.projectName : entry.taskName;
          return (
            <List.Item
              id={entry.id}
              key={entry.id}
              title={titleDisplay === "task" ? entry.taskName : entry.projectName}
              subtitle={entry.notes}
              keywords={[
                ...entry.notes.split(/\s+/),
                ...(entry.clientName?.split(/\s+/) ?? []),
                ...other.split(/\s+/),
              ].filter(Boolean)}
              accessories={[
                { text: other, icon: Icon.Tag },
                ...(entry.clientName
                  ? [
                      {
                        text: entry.clientName,
                        icon: entry.externalReference?.serviceIconUrl
                          ? { source: entry.externalReference.serviceIconUrl }
                          : Icon.Building,
                      },
                    ]
                  : []),
                ...(approval
                  ? [{ tag: { value: approval, color: entry.approvalStatus === "rejected" ? Color.Red : Color.Blue } }]
                  : []),
                ...(!lock.canEdit ? [{ icon: Icon.Lock, tooltip: lock.reason }] : []),
                {
                  icon: entry.isRunning ? { source: Icon.Clock, tintColor: Color.Orange } : undefined,
                  tag: { value: formatHours(entry.hours), color: entry.isRunning ? Color.Orange : Color.SecondaryText },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section
                    title={`${entry.projectName}${entry.clientName ? ` | ${entry.clientName}` : ""}`}
                  >
                    {entry.isRunning && <Action title="Stop Timer" icon={Icon.Stop} onAction={() => stop(entry)} />}
                    {!entry.isRunning && isToday && lock.canRestart && (
                      <Action
                        title="Restart Timer"
                        icon={Icon.Play}
                        onAction={() => runStart("Restarting timer…", () => restartEntry(ctx(), entry))}
                      />
                    )}
                    {!isToday && (
                      <Action
                        title="Start on Today"
                        icon={Icon.Calendar}
                        onAction={async () => {
                          const result = await runStart("Starting timer…", () =>
                            startTimer(ctx(), {
                              projectId: entry.projectId,
                              taskId: entry.taskId,
                              spentDate: todayString(session),
                              notes: entry.notes || undefined,
                              externalReference: entry.externalReference,
                            }),
                          );
                          if (result?.status === "started") changeDate("today");
                        }}
                      />
                    )}
                    {lock.canEdit && (
                      <Action.Push
                        title="Edit Time Entry"
                        icon={Icon.Pencil}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        target={<EntryForm session={session} entry={entry} onSave={afterChange} />}
                      />
                    )}
                    <Action.Push
                      title="Duplicate Time Entry"
                      icon={Icon.Clipboard}
                      shortcut={Keyboard.Shortcut.Common.Duplicate}
                      target={
                        <EntryForm
                          session={session}
                          template={entry}
                          viewDate={dayjs(date).toDate()}
                          onSave={afterChange}
                        />
                      }
                    />
                    {entry.externalReference?.permalink && (
                      <Action.OpenInBrowser
                        title={`Open ${entry.externalReference.serviceName ?? "Linked Item"}`}
                        url={entry.externalReference.permalink}
                      />
                    )}
                    {lock.canDelete && (
                      <Action
                        title="Delete Time Entry"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => remove(entry)}
                      />
                    )}
                  </ActionPanel.Section>
                  {commonActions}
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
  return <KeitoGate>{(session) => <Timesheet session={session} />}</KeitoGate>;
}
