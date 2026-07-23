/* eslint-disable @raycast/prefer-title-case -- action titles intentionally keep acronyms/product terms uppercase (ID, ADO, AI) */
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { clearAdoCache, getCurrentIteration, getPlannerItems } from "./lib/ado";
import {
  getPlan,
  restoreManualTodo,
  setManualTodoStatus,
  setStatus,
} from "./lib/storage";
import { statusColor, statusIcon, statusLabel } from "./lib/status";
import { NoteStatusSubmenu, StatusSubmenu } from "./lib/status-actions";
import { QuickNoteForm } from "./lib/quick-note-form";
import { useLocalLayer } from "./lib/use-local-layer";
import { markWorkItemDone } from "./lib/ui";
import { orderItems, projectPlan, remainingWorkingDays } from "./lib/plan";
import { LocalStatus, ManualTodo, Preferences, WorkItem } from "./lib/types";

/** Whole calendar days since a note was created (0 = today), for the carried badge. */
function carriedDays(createdAtIso: string): number {
  const created = new Date(createdAtIso);
  created.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.floor((today.getTime() - created.getTime()) / 86400000),
  );
}

const noteStatusOf = (note: ManualTodo): LocalStatus =>
  note.status ?? "not-started";

/** Render note text as markdown that keeps its line breaks (each line stays a line). */
function noteMarkdown(text: string): string {
  return text.split("\n").join("  \n");
}

/**
 * Full-screen read view for a note (opened with Enter) so long notes are shown
 * completely without a split-pane list. Offers Edit and Set Status inline.
 */
function NoteView({
  note,
  onChanged,
}: {
  note: ManualTodo;
  onChanged: () => void;
}) {
  const { pop } = useNavigation();
  const status = noteStatusOf(note);
  const carried = carriedDays(note.createdAt);

  async function setNoteStatus(s: LocalStatus) {
    await setManualTodoStatus(note.id, s);
    onChanged();
    if (s === "done") {
      pop(); // note is gone — return to the list
      await showToast({
        style: Toast.Style.Success,
        title: "Note done",
        primaryAction: {
          title: "Undo",
          onAction: async () => {
            await restoreManualTodo(note);
            onChanged();
          },
        },
      });
    }
  }

  return (
    <Detail
      navigationTitle="Quick Note"
      markdown={noteMarkdown(note.text)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={statusLabel(status)} />
          <Detail.Metadata.Label
            title="Age"
            text={carried === 0 ? "Today" : `Carried ${carried}d`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Note"
            icon={Icon.Pencil}
            target={<QuickNoteForm onChanged={onChanged} note={note} />}
          />
          <NoteStatusSubmenu current={status} onSet={setNoteStatus} />
        </ActionPanel>
      }
    />
  );
}

export default function Today() {
  const prefs = getPreferenceValues<Preferences>();
  const doneState = prefs.doneState;
  const capacity = parseInt(prefs.dailyCapacity || "3", 10) || 3;
  const includeBacklog = prefs.includeBacklog !== false;

  const { data, isLoading, revalidate } = useCachedPromise(
    async (backlog: boolean) => {
      const [iteration, items, plan] = await Promise.all([
        getCurrentIteration(),
        getPlannerItems(backlog),
        getPlan(),
      ]);
      return { iteration, items, plan };
    },
    [includeBacklog],
    { keepPreviousData: true },
  );

  const { statusOf, deferred, notes, revalidateLocal } = useLocalLayer();

  const items = data?.items ?? [];
  const byId = new Map<number, WorkItem>(items.map((i) => [i.id, i]));
  const openItems = items.filter(
    (i) => !deferred.has(i.id) && statusOf(i.id) !== "done",
  );

  // Project the saved order (or the default rank if no plan saved) onto the
  // remaining days; "today" is the first day's slice and rolls unfinished work.
  const defaultOrder = orderItems(openItems, statusOf);
  const openSorted = defaultOrder
    .map((id) => byId.get(id))
    .filter((x): x is WorkItem => Boolean(x));
  const order = data?.plan?.order ?? defaultOrder;
  const days = data
    ? remainingWorkingDays(data.iteration.startDate, data.iteration.finishDate)
    : [];
  const todays = projectPlan(order, openSorted, days, capacity).todays;

  // Manual notes are a display-only overlay: they sit atop the plan and never
  // affect the projection above.
  const total = todays.length + notes.length;

  async function pushToAdo(item: WorkItem) {
    if (await markWorkItemDone(item.id, doneState)) {
      await setStatus(item.id, "done");
      await revalidateLocal();
      revalidate();
    }
  }

  async function setNoteStatus(note: ManualTodo, status: LocalStatus) {
    await setManualTodoStatus(note.id, status);
    await revalidateLocal();
    if (status === "done") {
      // "done" removes the note — offer a one-tap Undo.
      await showToast({
        style: Toast.Style.Success,
        title: "Note done",
        primaryAction: {
          title: "Undo",
          onAction: async () => {
            await restoreManualTodo(note);
            await revalidateLocal();
          },
        },
      });
    }
  }

  // Reachable from every row and the empty view, so you can jot even on a clear day.
  const addNoteAction = (
    <Action.Push
      title="Add Quick Note"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<QuickNoteForm onChanged={revalidateLocal} />}
    />
  );

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={async () => {
        await clearAdoCache();
        revalidate();
      }}
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Today — ${total} left`}
      searchBarPlaceholder="Today's to-do"
    >
      {notes.length > 0 && (
        <List.Section title="Quick Notes" subtitle={`${notes.length}`}>
          {notes.map((note) => {
            const status = noteStatusOf(note);
            const carried = carriedDays(note.createdAt);
            return (
              <List.Item
                key={note.id}
                icon={{ source: Icon.Pencil, tintColor: statusColor(status) }}
                title={note.text}
                // Status shows via the tinted icon; keep only the carried badge
                // so the note text gets as much width as possible.
                accessories={
                  carried > 0
                    ? [
                        {
                          tag: {
                            value: `carried ${carried}d`,
                            color: Color.Orange,
                          },
                        },
                      ]
                    : []
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Full Note"
                      icon={Icon.Eye}
                      target={
                        <NoteView note={note} onChanged={revalidateLocal} />
                      }
                    />
                    <NoteStatusSubmenu
                      current={status}
                      onSet={(s) => setNoteStatus(note, s)}
                    />
                    <Action.Push
                      title="Edit Note"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      target={
                        <QuickNoteForm
                          onChanged={revalidateLocal}
                          note={note}
                        />
                      }
                    />
                    {addNoteAction}
                    {refreshAction}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {todays.length > 0 && (
        <List.Section title="Sprint" subtitle={`${todays.length}`}>
          {todays.map((item) => {
            const status = statusOf(item.id);
            return (
              <List.Item
                key={item.id}
                icon={{
                  source: statusIcon(status),
                  tintColor: statusColor(status),
                }}
                title={item.title}
                subtitle={`#${item.id}`}
                accessories={[
                  ...(item.inSprint === false
                    ? [{ tag: { value: "Backlog", color: Color.Orange } }]
                    : []),
                  {
                    tag: {
                      value: statusLabel(status),
                      color: statusColor(status),
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={item.url} />
                    <StatusSubmenu
                      id={item.id}
                      current={status}
                      onChange={revalidateLocal}
                    />
                    <Action
                      title={`Also Push to ADO (${doneState})`}
                      icon={Icon.Upload}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={() => pushToAdo(item)}
                    />
                    {addNoteAction}
                    {refreshAction}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {!isLoading && total === 0 && (
        <List.EmptyView
          icon={Icon.Sun}
          title="Nothing to do today"
          description="All caught up — jot a quick note, or re-plan the sprint."
          actions={<ActionPanel>{addNoteAction}</ActionPanel>}
        />
      )}
    </List>
  );
}
