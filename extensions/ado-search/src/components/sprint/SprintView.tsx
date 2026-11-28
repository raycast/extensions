import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useLocalStorage, usePromise } from "@raycast/utils";
import { getIterations, getSprintItems, getWorkItems } from "../../lib/sprint-api";
import { Iteration, SprintItem } from "../../lib/sprint-types";
import { fmtHours, groupByStory, isStory, stateIcon } from "../../lib/sprint-utils";
import { ErrorView } from "./ErrorView";
import { NewTaskForm } from "./NewTaskForm";
import { SprintListItem } from "./SprintListItem";

type Mode = "us" | "state";
const STATE_ORDER = ["New", "To Do", "Active", "In Progress", "Committed", "Resolved", "Done", "Closed"];
const stateRank = (s: string) => {
  const i = STATE_ORDER.indexOf(s);
  return i === -1 ? 50 : i;
};
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : "");
const mod = (key: Keyboard.KeyEquivalent, shift = false): Keyboard.Shortcut => ({
  macOS: { modifiers: shift ? ["cmd", "shift"] : ["cmd"], key },
  Windows: { modifiers: shift ? ["ctrl", "shift"] : ["ctrl"], key },
});

/** Work items of a sprint: the current one by default, any other through the dropdown. */
export function SprintView() {
  const {
    value: mode = "us",
    setValue: setMode,
    isLoading: loadingMode,
  } = useLocalStorage<Mode>("sprint.groupMode", "us");
  const {
    value: onlyMine = true,
    setValue: setOnlyMine,
    isLoading: loadingMine,
  } = useLocalStorage<boolean>("sprint.onlyMine", true);
  // Exclude: every status starts checked; unchecking one hides it. Remembered between sessions.
  const { value: hiddenStates = [], setValue: setHiddenStates } = useLocalStorage<string[]>("sprint.hiddenStates", []);
  const toggleHidden = (st: string) =>
    setHiddenStates(hiddenStates.includes(st) ? hiddenStates.filter((x) => x !== st) : [...hiddenStates, st]);
  // Include: every status starts unchecked; once any is checked, only those are shown. Remembered too.
  const { value: onlyStates = [], setValue: setOnlyStates } = useLocalStorage<string[]>("sprint.onlyStates", []);
  const toggleOnly = (st: string) =>
    setOnlyStates(onlyStates.includes(st) ? onlyStates.filter((x) => x !== st) : [...onlyStates, st]);
  const statusVisible = (st: string) =>
    !hiddenStates.includes(st) && (onlyStates.length === 0 || onlyStates.includes(st));

  const {
    data: iterations,
    isLoading: loadingIteration,
    error: iterationsError,
    revalidate: reloadIterations,
  } = useCachedPromise(getIterations);
  const current = iterations?.find((i) => i.timeFrame === "current");
  // Always opens on the current sprint; the dropdown switches to any other one.
  // The chosen sprint is remembered. Choosing the current sprint clears it, so the view keeps following
  // "current" when a new sprint starts. A remembered sprint that no longer exists falls back to current.
  const {
    value: selectedPath,
    setValue: setSelectedPath,
    removeValue: clearSelectedPath,
    isLoading: loadingPref,
  } = useLocalStorage<string>("sprint.selected");
  const iteration = iterations?.find((i) => i.path === selectedPath) ?? current;

  const { data, isLoading, error, revalidate } = usePromise(
    async (it: Iteration) => {
      const { items, mine } = await getSprintItems(it);
      const have = new Set(items.map((i) => i.id));
      const missing = [...new Set(items.map((i) => i.parentId).filter((x): x is number => !!x && !have.has(x)))];
      const all = new Map<number, SprintItem>(items.map((i) => [i.id, i]));
      const parents = new Map(all);
      for (const p of await getWorkItems(missing)) parents.set(p.id, p);
      return { items, mine, all, parents };
    },
    [iteration as Iteration],
    { execute: !!iteration && !loadingPref },
  );

  const allItems = data?.items ?? [];
  const states = [...new Set(allItems.map((i) => i.state))].sort((a, b) => stateRank(a) - stateRank(b));
  const visible = allItems.filter((i) => (!onlyMine || data?.mine.has(i.id)) && statusVisible(i.state));
  const parents = data?.parents ?? new Map<number, SprintItem>();

  const viewActions = (
    <ActionPanel.Section title="View">
      <Action
        title={mode === "us" ? "Group by Status" : "Group by User Story"}
        icon={mode === "us" ? Icon.CircleProgress50 : Icon.Book}
        shortcut={mod("g")}
        onAction={() => setMode(mode === "us" ? "state" : "us")}
      />
      <Action
        title={onlyMine ? "Show Whole Team" : "Show Only My Items"}
        icon={onlyMine ? Icon.TwoPeople : Icon.Person}
        shortcut={mod("m", true)}
        onAction={() => setOnlyMine(!onlyMine)}
      />
      <ActionPanel.Submenu title="Show Only Statuses" icon={Icon.Filter} shortcut={mod("f", true)}>
        {states.map((st) => (
          <Action
            key={st}
            title={`${onlyStates.includes(st) ? "✓ " : ""}${st}`}
            icon={stateIcon(st)}
            onAction={() => toggleOnly(st)}
          />
        ))}
        <Action title="Clear Selection" icon={Icon.XMarkCircle} onAction={() => setOnlyStates([])} />
      </ActionPanel.Submenu>
      <ActionPanel.Submenu title="Exclude Statuses" icon={Icon.EyeDisabled} shortcut={mod("e", true)}>
        {states.map((st) => (
          <Action
            key={st}
            title={`${hiddenStates.includes(st) ? "" : "✓ "}${st}`}
            icon={stateIcon(st)}
            onAction={() => toggleHidden(st)}
          />
        ))}
        <Action title="Include All Statuses" icon={Icon.Eye} onAction={() => setHiddenStates([])} />
      </ActionPanel.Submenu>
      <Action
        title="Reset All Status Filters"
        icon={Icon.ArrowCounterClockwise}
        shortcut={mod("r", true)}
        onAction={() => {
          setOnlyStates([]);
          setHiddenStates([]);
        }}
      />
    </ActionPanel.Section>
  );

  const completedOf = (storyId: number) =>
    allItems.filter((t) => t.sprintParentId === storyId).reduce((sum, t) => sum + (t.completed ?? 0), 0);

  // A story whose tasks were all hidden by the status filter disappears with them. A story whose own
  // status is hidden is dropped too, but its visible tasks stay under the section header.
  const visibleIds = new Set(visible.map((i) => i.id));
  const storyGroups = groupByStory(visible, parents).filter((g) => {
    if (!g.story || g.tasks.length > 0) return true;
    const storyId = g.story.id;
    const hiddenByStatus = allItems.some(
      (t) => t.sprintParentId === storyId && (!onlyMine || data?.mine.has(t.id)) && !statusVisible(t.state),
    );
    return visibleIds.has(storyId) && !hiddenByStatus;
  });

  const row = (it: SprintItem, showState = true, icon?: List.Item.Props["icon"]) => (
    <SprintListItem
      key={it.id}
      item={it}
      parent={it.parentId ? parents.get(it.parentId) : undefined}
      onDone={revalidate}
      showStateTag={showState}
      extraActions={viewActions}
      icon={icon}
      completedSum={isStory(it) ? completedOf(it.id) : undefined}
    />
  );

  const sprintItem = (i: Iteration) => (
    <List.Dropdown.Item
      key={i.id}
      value={i.path}
      title={`${i.name}${i.start && i.end ? ` (${fmtDate(i.start)} – ${fmtDate(i.end)})` : ""}`}
      icon={i.timeFrame === "current" ? Icon.CircleFilled : Icon.Circle}
    />
  );
  const byStart = (a: Iteration, b: Iteration) => (a.start ?? "").localeCompare(b.start ?? "");
  const future = (iterations ?? []).filter((i) => i.timeFrame === "future").sort(byStart);
  const past = (iterations ?? []).filter((i) => i.timeFrame === "past").sort((a, b) => byStart(b, a));

  // The sprint and the active filters live in the search placeholder: the root command title stays untouched.
  const scope = `${iteration?.name ?? "sprint"} · ${onlyMine ? "mine" : "team"}`;
  const filters = `${onlyStates.length ? ` · only ${onlyStates.join(", ")}` : ""}${hiddenStates.length ? ` · hiding ${hiddenStates.join(", ")}` : ""}`;

  return (
    <List
      isLoading={isLoading || loadingIteration || loadingPref || loadingMode || loadingMine}
      searchBarPlaceholder={`Search #number or text · ${scope}${filters}`}
      searchBarAccessory={
        (iterations?.length ?? 0) > 0 ? (
          <List.Dropdown
            tooltip="Sprint"
            value={iteration?.path}
            onChange={(p) => (p === current?.path ? clearSelectedPath() : setSelectedPath(p))}
          >
            {current && <List.Dropdown.Section title="Current">{sprintItem(current)}</List.Dropdown.Section>}
            {future.length > 0 && (
              <List.Dropdown.Section title="Upcoming">{future.map(sprintItem)}</List.Dropdown.Section>
            )}
            {past.length > 0 && <List.Dropdown.Section title="Past">{past.map(sprintItem)}</List.Dropdown.Section>}
          </List.Dropdown>
        ) : undefined
      }
    >
      {iterationsError || error ? (
        <ErrorView
          error={(iterationsError ?? error) as Error}
          retry={() => {
            reloadIterations();
            revalidate();
          }}
        />
      ) : null}
      {!iterationsError && !isLoading && !loadingIteration && !loadingPref && !iteration ? (
        <List.EmptyView
          title="No current sprint"
          description="Pick a sprint from the dropdown, if the team has any."
          icon={Icon.Calendar}
        />
      ) : null}
      {!iterationsError && !error && !isLoading && iteration && visible.length === 0 ? (
        <List.EmptyView
          title="No work items"
          description="Nothing matches the current filters."
          icon={Icon.Tray}
          actions={
            <ActionPanel>
              <Action.Push
                title="New Task"
                icon={Icon.Plus}
                shortcut={mod("n")}
                target={<NewTaskForm iterationPath={iteration.path} onCreated={revalidate} />}
              />
              {viewActions}
            </ActionPanel>
          }
        />
      ) : null}

      {mode === "us" &&
        storyGroups.map((g) => {
          const hours = g.tasks.reduce((s, t) => s + (t.estimate ?? 0), 0);
          return (
            <List.Section
              key={g.key}
              title={g.story ? `${g.story.type} #${g.story.id}` : g.title}
              subtitle={`${g.tasks.length} tasks · ${fmtHours(hours)}`}
            >
              {g.story &&
                visibleIds.has(g.story.id) &&
                row(g.story, true, { source: Icon.Book, tintColor: Color.Purple })}
              {g.tasks.map((t) => row(t))}
            </List.Section>
          );
        })}

      {mode === "state" &&
        [...new Set(visible.map((i) => i.state))]
          .sort((a, b) => stateRank(a) - stateRank(b))
          .map((s) => {
            const r = visible.filter((i) => i.state === s);
            return (
              <List.Section key={s} title={s} subtitle={String(r.length)}>
                {r.map((i) => row(i, false))}
              </List.Section>
            );
          })}
    </List>
  );
}
