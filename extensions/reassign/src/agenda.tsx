import {
  Action,
  ActionPanel,
  Icon,
  launchCommand,
  LaunchType,
  List,
  open,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import {
  AgendaActions,
  AgendaNavActions,
  OptimisticForOps,
  ScheduleData,
  useAgendaMutations,
} from "./components/agenda-actions";
import { AgendaItem } from "./components/agenda-item";
import { SearchView } from "./components/search-view";
import { refusalView } from "./components/states";
import { ApiError, getSchedule, getScheduleRange, WriteOp } from "./lib/api";
import { addDaysISO, addMinutesHM, relativeDayLabel, todayISO } from "./lib/format";
import {
  buildRangeAgenda,
  buildTodayModel,
  collectAgendaFilters,
  DayAgenda,
  eventMatchesFilter,
  passesKindFilter,
  ScheduleEvent,
  TodaySection,
} from "./lib/schedule-model";
import { webDayUrl } from "./lib/wire";

type AgendaScope = "day" | "week";
const WEEK_DAYS = 7;

const SECTION_TITLES: Record<TodaySection, string> = {
  now: "Now",
  upNext: "Up next",
  later: "Later",
  done: "Done",
};

/** Session filters that hide blocks by kind. Shared by the day and week views. */
interface KindFilter {
  hideNonBlocking: boolean;
  hideReference: boolean;
  onToggleNonBlocking: () => void;
  onToggleReference: () => void;
}

/** The Agenda command: a single day (default) or the next week, one toggle apart. */
export default function Command() {
  // Persist the scope and kind toggles across launches (useState resets on close).
  const { value: storedScope, setValue: setScope } = useLocalStorage<AgendaScope>(
    "agenda.scope",
    "week",
  );
  const scope = storedScope ?? "week";
  const { value: hideNonBlocking, setValue: setHideNonBlocking } = useLocalStorage(
    "agenda.hideNonBlocking",
    false,
  );
  const { value: hideReference, setValue: setHideReference } = useLocalStorage(
    "agenda.hideReference",
    false,
  );
  const onToggleScope = () => setScope(scope === "day" ? "week" : "day");
  const hideNB = hideNonBlocking ?? false;
  const hideRef = hideReference ?? false;
  const kind: KindFilter = {
    hideNonBlocking: hideNB,
    hideReference: hideRef,
    onToggleNonBlocking: () => setHideNonBlocking(!hideNB),
    onToggleReference: () => setHideReference(!hideRef),
  };
  return scope === "day" ? (
    <DayView scope={scope} onToggleScope={onToggleScope} kind={kind} />
  ) : (
    <WeekView scope={scope} onToggleScope={onToggleScope} kind={kind} />
  );
}

/** The Day / Week switch, shared by both views' Navigate section. */
function ScopeToggle(props: { scope: AgendaScope; onToggle: () => void }) {
  return (
    <Action
      title={props.scope === "day" ? "Show Week" : "Show Day"}
      icon={props.scope === "day" ? Icon.Calendar : Icon.Sun}
      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      onAction={props.onToggle}
    />
  );
}

/** The two kind-visibility toggles, shared by both views' Filter section. */
function KindFilterActions(props: KindFilter) {
  return (
    <>
      <Action
        title={props.hideNonBlocking ? "Show Non-Blocking Blocks" : "Hide Non-Blocking Blocks"}
        icon={props.hideNonBlocking ? Icon.Eye : Icon.EyeDisabled}
        onAction={props.onToggleNonBlocking}
      />
      <Action
        title={props.hideReference ? "Show Reference Blocks" : "Hide Reference Blocks"}
        icon={props.hideReference ? Icon.Eye : Icon.EyeDisabled}
        onAction={props.onToggleReference}
      />
    </>
  );
}

/** Open the full-text search over every block, from inside the agenda. */
function SearchAction() {
  const { push } = useNavigation();
  return (
    <Action
      title="Search All Blocks…"
      icon={Icon.MagnifyingGlass}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      onAction={() => push(<SearchView />)}
    />
  );
}

// --- Day view (Now / Up next / Later / Done, with day-nav) -------------------

function DayView(props: { scope: AgendaScope; onToggleScope: () => void; kind: KindFilter }) {
  const [date, setDate] = useState(todayISO());
  const [showingDetail, setShowingDetail] = useState(true);
  const [filter, setFilter] = useState("all");
  const { data, isLoading, revalidate, mutate } = useCachedPromise(getSchedule, [date], {
    keepPreviousData: true,
  });
  const {
    mutate: applyMutation,
    applyEdit,
    lastUndoToken,
    runUndo,
  } = useAgendaMutations({ revalidate, optimistic: { mutate, forOps: buildOptimistic } });

  const todayIso = data?.ok ? data.data.now.todayIso : todayISO();
  const dayLabel = relativeDayLabel(date, todayIso);

  if (data && !data.ok) return refusalView(data, revalidate);

  const model = data?.ok ? buildTodayModel(data.data, date) : null;

  // Reset the filter on a day change; a day's areas may not exist on the next.
  function goToDay(delta: number) {
    setFilter("all");
    setDate(addDaysISO(date, delta));
  }

  function navSection() {
    return (
      <>
        <ActionPanel.Section title="Filter">
          <KindFilterActions {...props.kind} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Navigate">
          <Action
            title="Previous Day"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            onAction={() => goToDay(-1)}
          />
          <Action
            title="Next Day"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
            onAction={() => goToDay(1)}
          />
          <ScopeToggle scope={props.scope} onToggle={props.onToggleScope} />
          <SearchAction />
          <AgendaNavActions
            showingDetail={showingDetail}
            onToggleDetail={() => setShowingDetail((on) => !on)}
            onRefresh={revalidate}
          />
        </ActionPanel.Section>
      </>
    );
  }

  const sections: TodaySection[] = ["now", "upNext", "later", "done"];
  const filterOptions = model ? collectAgendaFilters(model) : { areas: [], activities: [] };
  const hasFilters = filterOptions.areas.length > 0 || filterOptions.activities.length > 0;
  const { hideNonBlocking, hideReference } = props.kind;
  // Filter each section once; the render and the emptiness check both read this.
  const filtered = model
    ? sections.map(
        (key) =>
          [
            key,
            model.sections[key].filter(
              (e) =>
                eventMatchesFilter(e, model, filter) &&
                passesKindFilter(e, hideNonBlocking, hideReference),
            ),
          ] as const,
      )
    : [];
  const isEmpty = model ? filtered.every(([, events]) => events.length === 0) : false;
  const isFiltered = filter !== "all" || hideNonBlocking || hideReference;
  const backlogCount = data?.ok ? (data.data.backlogCount ?? 0) : 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={Boolean(model) && !isEmpty && showingDetail}
      navigationTitle={`Agenda · ${dayLabel}`}
      searchBarPlaceholder="Filter blocks by name, area, or activity"
      searchBarAccessory={
        model && hasFilters ? (
          <List.Dropdown tooltip="Filter by area or activity" value={filter} onChange={setFilter}>
            <List.Dropdown.Item title="All Blocks" value="all" />
            {filterOptions.areas.length > 0 && (
              <List.Dropdown.Section title="Areas">
                {filterOptions.areas.map((area) => (
                  <List.Dropdown.Item
                    key={area.id}
                    title={area.name}
                    value={`area:${area.id}`}
                    icon={{ source: Icon.Dot, tintColor: area.color }}
                  />
                ))}
              </List.Dropdown.Section>
            )}
            {filterOptions.activities.length > 0 && (
              <List.Dropdown.Section title="Activities">
                {filterOptions.activities.map((activity) => (
                  <List.Dropdown.Item
                    key={activity.id}
                    title={activity.name}
                    value={`activity:${activity.id}`}
                  />
                ))}
              </List.Dropdown.Section>
            )}
          </List.Dropdown>
        ) : undefined
      }
    >
      {model &&
        filtered.map(([key, events]) => {
          if (events.length === 0) return null;
          return (
            <List.Section key={key} title={SECTION_TITLES[key]} subtitle={String(events.length)}>
              {events.map((event) => (
                <AgendaItem
                  key={`${event.id}-${event.start}`}
                  event={event}
                  areas={model.areas}
                  activityTypes={model.activityTypes}
                  isShowingDetail={showingDetail}
                  actions={
                    <AgendaActions
                      event={event}
                      date={date}
                      areas={model.areas}
                      activityTypes={model.activityTypes}
                      mutate={applyMutation}
                      onEdit={(id, patch) => applyEdit("Saving…", "Saved changes", id, patch)}
                      lastUndoToken={lastUndoToken}
                      runUndo={runUndo}
                      nav={navSection()}
                    />
                  }
                />
              ))}
            </List.Section>
          );
        })}
      {model && isEmpty && (
        <List.EmptyView
          icon={isFiltered ? Icon.Filter : Icon.Calendar}
          title={isFiltered ? "No blocks match" : "Nothing planned"}
          description={
            isFiltered
              ? "Pick another area or activity, or clear the filter."
              : `You have no blocks for ${dayLabel.toLowerCase()}.`
          }
          actions={
            <ActionPanel>
              {isFiltered && (
                <Action
                  title="Clear Filter"
                  icon={Icon.XMarkCircle}
                  onAction={() => {
                    setFilter("all");
                    if (hideNonBlocking) props.kind.onToggleNonBlocking();
                    if (hideReference) props.kind.onToggleReference();
                  }}
                />
              )}
              <Action
                title="Schedule a Block…"
                icon={Icon.Plus}
                onAction={() => launchCommand({ name: "add", type: LaunchType.UserInitiated })}
              />
              {backlogCount > 0 && (
                <Action
                  title={`Open Inbox (${backlogCount})`}
                  icon={Icon.Tray}
                  onAction={() => launchCommand({ name: "inbox", type: LaunchType.UserInitiated })}
                />
              )}
              {navSection()}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

type OptimisticOp = Extract<WriteOp, { op: "reflect" | "delete" | "shift" }>;

/**
 * Build an optimistic cache transform from a 1-op reflect / delete / shift batch.
 * The row updates instantly; `mutate` reconciles or rolls back after the call.
 * A move op returns undefined — it goes through the plain (revalidate) path.
 */
const buildOptimistic: OptimisticForOps<ScheduleData> = (ops) => {
  if (ops.length !== 1) return undefined;
  const op = ops[0];
  if (op.op !== "reflect" && op.op !== "delete" && op.op !== "shift") return undefined;
  return (current) => {
    if (!current || !current.ok) return current;
    return {
      ...current,
      data: {
        ...current.data,
        days: current.data.days.map((day) => ({
          ...day,
          events: transformEvents(day.events ?? [], op),
        })),
      },
    };
  };
};

function transformEvents(events: ScheduleEvent[], op: OptimisticOp): ScheduleEvent[] {
  if (op.op === "delete") return events.filter((event) => event.id !== op.id);
  return events.map((event) => {
    if (event.id !== op.id) return event;
    // Set both fields: reflectState reads `state` first, so a re-reflect of an
    // already-reflected block must overwrite `state`, not only `status`.
    if (op.op === "reflect")
      return { ...event, reflect: { ...event.reflect, state: op.status, status: op.status } };
    return {
      ...event,
      start: addMinutesHM(event.start, op.byMinutes),
      end: addMinutesHM(event.end, op.byMinutes),
    };
  });
}

/** The same reflect / delete / shift transform, over the week cache (days[]). */
const buildWeekOptimistic: OptimisticForOps<WeekResult | undefined> = (ops) => {
  if (ops.length !== 1) return undefined;
  const op = ops[0];
  if (op.op !== "reflect" && op.op !== "delete" && op.op !== "shift") return undefined;
  return (current) => {
    if (!current || !current.ok) return current;
    return {
      ...current,
      days: current.days.map((day) => ({
        ...day,
        model: { ...day.model, events: transformEvents(day.model.events, op) },
      })),
    };
  };
};

// --- Week view (next 7 days, one section per day) ----------------------------

interface WeekDay {
  date: string;
  model: DayAgenda;
}

function WeekView(props: { scope: AgendaScope; onToggleScope: () => void; kind: KindFilter }) {
  const [showingDetail, setShowingDetail] = useState(true);
  const {
    data,
    isLoading,
    revalidate,
    mutate: cacheMutate,
  } = useCachedPromise(loadWeek, [todayISO()], {
    keepPreviousData: true,
  });
  const { mutate, applyEdit, lastUndoToken, runUndo } = useAgendaMutations<WeekResult | undefined>({
    revalidate,
    optimistic: { mutate: cacheMutate, forOps: buildWeekOptimistic },
  });

  if (data && !data.ok) return refusalView(data, revalidate);

  const todayIso = data?.ok ? data.todayIso : todayISO();
  const days = data?.ok ? data.days : [];
  const { hideNonBlocking, hideReference } = props.kind;
  const filteredDays = days.map((day) => ({
    day,
    events: day.model.events.filter((e) => passesKindFilter(e, hideNonBlocking, hideReference)),
  }));
  const hasAnyEvent = filteredDays.some((f) => f.events.length > 0);

  function navSection() {
    return (
      <>
        <ActionPanel.Section title="Filter">
          <KindFilterActions {...props.kind} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Navigate">
          <ScopeToggle scope={props.scope} onToggle={props.onToggleScope} />
          <SearchAction />
          <AgendaNavActions
            showingDetail={showingDetail}
            onToggleDetail={() => setShowingDetail((on) => !on)}
            onRefresh={revalidate}
          />
        </ActionPanel.Section>
      </>
    );
  }

  function placeholderActions(date: string) {
    return (
      <ActionPanel>
        <Action
          title="Schedule a Block…"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "add", type: LaunchType.UserInitiated })}
        />
        <Action
          title="Open Day in Reassign"
          icon={Icon.Globe}
          onAction={() => open(webDayUrl(date))}
        />
        {navSection()}
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={hasAnyEvent && showingDetail}
      navigationTitle={`Agenda · Next ${WEEK_DAYS} Days`}
      searchBarPlaceholder="Filter blocks by name, area, or activity"
    >
      {filteredDays.map(({ day, events }) => (
        <List.Section
          key={day.date}
          title={relativeDayLabel(day.date, todayIso)}
          subtitle={String(events.length)}
        >
          {events.length === 0 ? (
            <List.Item
              icon={Icon.Calendar}
              title="Nothing planned — press Enter to add a block"
              actions={placeholderActions(day.date)}
            />
          ) : (
            events.map((event) => (
              <AgendaItem
                key={`${event.id}-${event.start}`}
                event={event}
                areas={day.model.areas}
                activityTypes={day.model.activityTypes}
                isShowingDetail={showingDetail}
                actions={
                  <AgendaActions
                    event={event}
                    date={day.date}
                    areas={day.model.areas}
                    activityTypes={day.model.activityTypes}
                    mutate={mutate}
                    onEdit={(id, patch) => applyEdit("Saving…", "Saved changes", id, patch)}
                    lastUndoToken={lastUndoToken}
                    runUndo={runUndo}
                    nav={navSection()}
                  />
                }
              />
            ))
          )}
        </List.Section>
      ))}
    </List>
  );
}

type WeekResult = { ok: true; todayIso: string; days: WeekDay[] } | ApiError;

// Read the whole week in one range call, then map to one agenda per day.
async function loadWeek(startISO: string): Promise<WeekResult> {
  const dates = Array.from({ length: WEEK_DAYS }, (_, i) => addDaysISO(startISO, i));
  const result = await getScheduleRange(startISO, dates[dates.length - 1]);
  if (!result.ok) return result;
  const todayIso = result.data.now.todayIso;
  const days = buildRangeAgenda(result.data, dates).map((model) => ({ date: model.date, model }));
  return { ok: true, todayIso, days };
}
