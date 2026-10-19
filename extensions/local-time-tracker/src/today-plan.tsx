import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useDailyPlan } from "./hooks/use-daily-plan";
import { formatDuration } from "./lib/duration";
import { showFailure } from "./lib/errors";
import { planDateLabel, planItemId, type PlanItem } from "./lib/plan-model";
import { planContent, planForDate, localDateKey, planMatches } from "./lib/planning";
import {
  importLatestPlansToToday,
  movePlannedItemToToday,
  removePlannedItem,
  reorderPlannedItem,
  savePlanDraft,
} from "./lib/planning-service";
import { sortProjectsByPreference } from "./lib/projects";
import { completePlannedItem, startPlannedTimer, stopTimer } from "./lib/timer";
import type { PlanReference } from "./lib/types";
import ProjectsCommand from "./projects";

type PlanState = ReturnType<typeof useDailyPlan>;

export default function TodayPlanCommand() {
  const [date, setDate] = useState(localDateKey(new Date()));
  const currentDate = useRef(date);
  currentDate.current = date;
  const [selected, setSelected] = useState<string>();
  const [search, setSearch] = useState("");
  const state = useDailyPlan(date);
  const { plan, busy, error, now, reload } = state;
  const previousToday = useRef(localDateKey(now));
  useEffect(() => {
    const today = localDateKey(now);
    if (today !== previousToday.current) {
      if (date === previousToday.current) {
        setDate(today);
        setSearch("");
        setSelected(undefined);
      }
      previousToday.current = today;
    }
  }, [date, now]);
  function saved(reference: PlanReference) {
    setSearch("");
    setSelected(planItemId(reference));
    void reload();
  }
  function moved(result: { date: string }) {
    setSearch("");
    setSelected(undefined);
    currentDate.current = result.date;
    setDate(result.date);
    if (result.date === date) void reload();
  }
  const newPlan = (
    <Action.Push
      title="New Plan"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<PlanEditor date={date} onSaved={saved} />}
      onPop={reload}
    />
  );
  return (
    <List
      key={`${date}:${plan ? "loaded" : "loading"}`}
      isLoading={(!plan && !error) || busy}
      navigationTitle={`${date === localDateKey(now) ? "Today's Plan" : "Daily Plan"}${plan ? ` · ${plan.goals.filter((goal) => goal.complete).length}/${plan.goals.length} complete · ${formatDuration(plan.totalSeconds)}` : ""}`}
      searchBarPlaceholder="Search goals and subtasks…"
      filtering={{ keepSectionOrder: true }}
      searchText={search}
      onSearchTextChange={setSearch}
      selectedItemId={selected}
      onSelectionChange={(id) => setSelected(id ?? undefined)}
      actions={
        plan && !error && !busy ? (
          <ActionPanel>
            {newPlan}
            <ImportLatestPlanAction state={state} onImported={moved} />
          </ActionPanel>
        ) : undefined
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Plan Date"
          value={date}
          onChange={(value) => {
            if (!busy && value !== currentDate.current) {
              currentDate.current = value;
              setDate(value);
              setSearch("");
              setSelected(undefined);
            }
          }}
        >
          {(plan?.dates ?? [date]).map((day) => (
            <List.Dropdown.Item
              key={day}
              value={day}
              title={`${day === localDateKey(now) ? "Today · " : ""}${planDateLabel(day)}`}
            />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Load Plan"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Reload Plan" onAction={reload} shortcut={Keyboard.Shortcut.Common.Refresh} />
            </ActionPanel>
          }
        />
      ) : null}
      {!error && plan?.goals.length === 0 ? (
        <List.EmptyView
          icon={Icon.List}
          title={date === localDateKey(now) ? "What Will You Work on Today?" : "No Plan for This Date"}
          description={
            date === plan.today && plan.previousPlanDate
              ? "⌘⇧I: import unfinished plans from the last day with tasks. Or create a new plan."
              : "Choose about three goals. Enter a goal on the first line and subtasks on the following lines."
          }
          actions={
            busy ? undefined : (
              <ActionPanel>
                {newPlan}
                <ImportLatestPlanAction state={state} onImported={moved} />
              </ActionPanel>
            )
          }
        />
      ) : null}
      {!error &&
        plan?.goals.map((goal) => (
          <List.Section key={goal.id}>
            {goal.tasks.length ? (
              <List.Item
                id={planItemId({ goalId: goal.id })}
                title={goal.title}
                subtitle={goal.projectName}
                keywords={goal.tasks.map((task) => task.title)}
                accessories={[
                  { text: `${goal.tasks.filter((task) => task.completedAt).length}/${goal.tasks.length} complete` },
                  { text: time(goal.seconds), tooltip: "Total time for this plan on this date" },
                ]}
                actions={
                  busy ? undefined : (
                    <TaskActions
                      state={state}
                      goal={goal}
                      reference={{ goalId: goal.id }}
                      complete={goal.complete}
                      onMoved={moved}
                      onSaved={saved}
                    />
                  )
                }
              />
            ) : null}
            {(goal.tasks.length ? goal.tasks : [undefined]).map((task) => {
              const reference = { goalId: goal.id, ...(task ? { taskId: task.id } : {}) };
              const complete = task ? !!task.completedAt : goal.complete;
              const running = planMatches(plan.active?.plan, reference);
              return (
                <List.Item
                  key={planItemId(reference)}
                  id={planItemId(reference)}
                  title={task?.title ?? goal.title}
                  subtitle={!task ? goal.projectName : undefined}
                  keywords={[goal.title, goal.projectName]}
                  icon={{
                    source: complete ? Icon.CheckCircle : Icon.Circle,
                    tintColor: complete ? Color.Green : Color.SecondaryText,
                  }}
                  accessories={[
                    ...(running ? [{ tag: { value: "Running", color: Color.Green } }] : []),
                    { text: time(task?.seconds ?? goal.seconds), tooltip: "Time tracked on this date" },
                  ]}
                  actions={
                    busy ? undefined : (
                      <TaskActions
                        state={state}
                        goal={goal}
                        reference={reference}
                        complete={complete}
                        onMoved={moved}
                        onSaved={saved}
                      />
                    )
                  }
                />
              );
            })}
          </List.Section>
        ))}
    </List>
  );
}

function TaskActions({
  state,
  goal,
  reference,
  complete,
  onMoved,
  onSaved,
}: {
  state: PlanState;
  goal: PlanItem;
  reference: PlanReference;
  complete: boolean;
  onMoved: (result: { date: string }) => void;
  onSaved: (reference: PlanReference) => void;
}) {
  const { plan, perform, reload } = state;
  if (!plan) return null;
  const running = planMatches(plan.active?.plan, reference);
  const parent = goal.tasks.length > 0 && !reference.taskId;
  async function toggleTimer() {
    await perform("Could Not Update Timer", async () => {
      if (running) {
        const result = await stopTimer(plan!.active!.id);
        if (result.status === "clock-rollback")
          throw new Error("Correct your Mac clock before stopping. The timer is still running.");
      } else {
        if (complete) throw new Error("Mark this task incomplete with ⌘Return before starting it");
        await startPlannedTimer(reference, false, plan!.active?.id ?? null, plan!.date);
      }
    });
  }
  async function move(reference: PlanReference) {
    const result = await perform("Could Not Move to Today", () =>
      movePlannedItemToToday({ ...reference, date: plan!.date, expectedUpdatedAt: goal.updatedAt }),
    );
    if (result) onMoved(result.value);
  }
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {parent ? (
          <Action.Push
            title="Edit Plan"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<PlanEditor date={plan.date} goal={goal} onSaved={onSaved} />}
            onPop={reload}
          />
        ) : (
          <Action
            title={running ? "Stop Work" : plan.active ? "Switch and Start" : "Start Work"}
            icon={running ? Icon.Stop : Icon.Play}
            onAction={toggleTimer}
          />
        )}
        <Action
          title={
            parent
              ? complete
                ? "Mark All Incomplete"
                : "Mark All Complete"
              : complete
                ? "Mark Incomplete"
                : "Mark Complete"
          }
          icon={complete ? Icon.Circle : Icon.CheckCircle}
          onAction={() =>
            perform("Could Not Update Completion", () => completePlannedItem(reference, !complete, plan.date))
          }
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Plan">
        {!parent ? (
          <Action.Push
            title="Edit Plan"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<PlanEditor date={plan.date} goal={goal} onSaved={onSaved} />}
            onPop={reload}
          />
        ) : null}
        <Action.Push
          title="New Plan"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<PlanEditor date={plan.date} onSaved={onSaved} />}
          onPop={reload}
        />
        <ImportLatestPlanAction state={state} onImported={onMoved} />
        {plan.date < plan.today && !goal.complete ? (
          <Action
            title="Move Plan to Today"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={() => move({ goalId: goal.id })}
          />
        ) : null}
        {goal.tasks.length && !parent ? (
          <Action
            title={goal.complete ? "Mark All Incomplete" : "Mark All Complete"}
            icon={Icon.CheckCircle}
            onAction={() =>
              perform("Could Not Update Completion", () =>
                completePlannedItem({ goalId: goal.id }, !goal.complete, plan.date),
              )
            }
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Sort">
        {goal.tasks.length ? (
          <Action.Push
            title="Sort Subtasks"
            icon={Icon.Switch}
            shortcut={Keyboard.Shortcut.Common.Save}
            target={<PlanSortView date={plan.date} goalId={goal.id} initialId={reference.taskId} />}
            onPop={reload}
          />
        ) : null}
        <Action.Push
          title="Sort Plans"
          icon={Icon.Switch}
          shortcut={{ modifiers: goal.tasks.length ? ["cmd", "shift"] : ["cmd"], key: "s" }}
          target={<PlanSortView date={plan.date} initialId={goal.id} />}
          onPop={reload}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Reload Plan"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={reload}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ImportLatestPlanAction({
  state,
  onImported,
}: {
  state: PlanState;
  onImported: (result: { date: string }) => void;
}) {
  const { plan, busy, perform } = state;
  if (!plan || busy || plan.date !== plan.today) return null;
  const sourceDate = plan.previousPlanDate;
  async function importLatest() {
    const result = await perform("Could Not Import Latest Plan", () => importLatestPlansToToday(sourceDate));
    if (!result) return;
    onImported(result.value);
    await showToast({
      style: Toast.Style.Success,
      title: result.value.count
        ? "Imported Latest Plan"
        : sourceDate
          ? "No Unfinished Plans to Import"
          : "No Past Plans to Import",
      message: sourceDate
        ? `${result.value.count} ${result.value.count === 1 ? "plan" : "plans"} from ${planDateLabel(sourceDate)}`
        : "No tasks remain on earlier dates. They may already be in today's plan.",
    });
  }
  return (
    <Action
      title="Import Latest Plan"
      icon={Icon.ArrowDown}
      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      onAction={importLatest}
    />
  );
}

function PlanEditor({
  date,
  goal,
  onSaved,
}: {
  date: string;
  goal?: PlanItem;
  onSaved: (reference: PlanReference) => void;
}) {
  const state = useDailyPlan(date);
  const { pop } = useNavigation();
  const [editing, setEditing] = useState(goal);
  const [content, setContent] = useState(goal ? planContent(goal) : "");
  const [projectId, setProjectId] = useState(goal?.projectId ?? "");
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const projects = sortProjectsByPreference(
    state.plan?.projects.filter((project) => project.isActive || project.id === editing?.projectId) ?? [],
  );
  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projectId, projects]);
  function choose(id: string) {
    if (!state.plan || id === (editing?.id ?? "new")) return;
    const next = state.plan?.goals.find((item) => item.id === id);
    setEditing(next);
    setContent(next ? planContent(next) : "");
    if (next) setProjectId(next.projectId);
  }
  async function save() {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try {
      const saved = await savePlanDraft({
        id: editing?.id,
        expectedUpdatedAt: editing?.updatedAt,
        date,
        content,
        projectId,
      });
      const firstTask = planForDate(saved, date)?.tasks[0];
      onSaved({ goalId: saved.id, ...(firstTask ? { taskId: firstTask.id } : {}) });
      pop();
    } catch (error) {
      await showFailure("Could Not Save Plan", error);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  async function remove() {
    if (
      !editing ||
      submitting.current ||
      !(await confirmAlert({
        title: "Delete Plan?",
        message: "Recorded time will remain in Work Logs. Subtasks on other dates will remain in their plans.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    submitting.current = true;
    setSaving(true);
    try {
      await removePlannedItem({ goalId: editing.id }, date, editing.updatedAt);
      pop();
    } catch (error) {
      await showFailure("Could Not Delete Plan", error);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  if (!state.plan) {
    return (
      <Form
        isLoading={!state.error}
        navigationTitle={editing ? "Edit Plan" : "New Plan"}
        actions={
          state.error ? (
            <ActionPanel>
              <Action title="Reload Plan" onAction={state.reload} />
            </ActionPanel>
          ) : undefined
        }
      >
        {state.error ? <Form.Description title="Could Not Load Plan" text={state.error} /> : null}
      </Form>
    );
  }
  return (
    <Form
      isLoading={saving || (!state.plan && !state.error)}
      navigationTitle={editing ? "Edit Plan" : "New Plan"}
      actions={
        saving || state.error ? undefined : (
          <ActionPanel>
            <Action.SubmitForm title="Save Plan" icon={Icon.Check} onSubmit={save} />
            <Action.Push title="Open Projects" icon={Icon.Folder} target={<ProjectsCommand />} onPop={state.reload} />
            {editing ? (
              <Action title="Delete Plan" icon={Icon.Trash} style={Action.Style.Destructive} onAction={remove} />
            ) : null}
          </ActionPanel>
        )
      }
    >
      {state.error ? <Form.Description title="Could Not Load Plan" text={state.error} /> : null}
      <Form.Dropdown id="plan" title="Plan" value={editing?.id ?? "new"} onChange={choose}>
        <Form.Dropdown.Item value="new" title="New Plan" />
        {state.plan?.goals.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="content"
        title="Plan and Subtasks"
        value={content}
        onChange={setContent}
        autoFocus
        placeholder={"Finish the contact form\nChoose input fields\nImplement validation"}
        info="First line: your goal. Following lines: one subtask per line. A single line is also fine."
      />
      <Form.Dropdown id="project" title="Project" value={projectId} onChange={setProjectId}>
        {!projects.length ? <Form.Dropdown.Item value="" title="Add an Active Project First" /> : null}
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>
      {editing?.sharedAcrossDates ? (
        <Form.Description text="Edit subtasks for this date. The goal name and project are shared across dates." />
      ) : null}
    </Form>
  );
}

function PlanSortView({ date, goalId, initialId }: { date: string; goalId?: string; initialId?: string }) {
  const state = useDailyPlan(date);
  const { pop } = useNavigation();
  const [selected, setSelected] = useState(initialId);
  const goal = state.plan?.goals.find((item) => item.id === goalId);
  const items = goalId ? (goal?.tasks ?? []) : (state.plan?.goals ?? []);
  async function move(id: string, direction: number) {
    const index = items.findIndex((item) => item.id === id);
    const target = items[index + direction];
    if (!target) return;
    const result = await state.perform("Could Not Reorder Plan", () =>
      reorderPlannedItem({
        date,
        goalId: goalId ?? id,
        ...(goalId ? { taskId: id } : {}),
        targetId: target.id,
        placement: direction < 0 ? "before" : "after",
      }),
    );
    if (result) setSelected(id);
  }
  return (
    <List
      isLoading={state.busy || (!state.plan && !state.error)}
      navigationTitle={goalId ? `Sort Subtasks · ${goal?.title ?? "Plan"}` : "Sort Plans"}
      searchBarPlaceholder="↑/↓: select · ⌘⌥↑/↓: move · Enter/Esc: done"
      filtering={false}
      selectedItemId={selected}
      onSelectionChange={(id) => setSelected(id ?? undefined)}
    >
      {state.error ? (
        <List.EmptyView
          title="Could Not Load Plan"
          description={state.error}
          actions={
            <ActionPanel>
              <Action title="Reload Plan" onAction={state.reload} />
            </ActionPanel>
          }
        />
      ) : null}
      {!state.error && items.length === 0 ? (
        <List.EmptyView
          title="Nothing to Sort"
          actions={
            <ActionPanel>
              <Action title="Done" onAction={pop} />
            </ActionPanel>
          }
        />
      ) : null}
      {!state.error
        ? items.map((item, index) => (
            <List.Item
              key={item.id}
              id={item.id}
              icon={Icon.List}
              title={item.title}
              subtitle={!goalId ? (item as PlanItem).projectName : undefined}
              accessories={[{ text: `${index + 1} / ${items.length}` }]}
              actions={
                state.busy ? undefined : (
                  <ActionPanel>
                    <Action title="Done" icon={Icon.Check} onAction={pop} />
                    {index > 0 ? (
                      <Action
                        title="Move up"
                        icon={Icon.ArrowUp}
                        shortcut={Keyboard.Shortcut.Common.MoveUp}
                        onAction={() => move(item.id, -1)}
                      />
                    ) : null}
                    {index < items.length - 1 ? (
                      <Action
                        title="Move Down"
                        icon={Icon.ArrowDown}
                        shortcut={Keyboard.Shortcut.Common.MoveDown}
                        onAction={() => move(item.id, 1)}
                      />
                    ) : null}
                    {!goalId && (item as PlanItem).tasks.length ? (
                      <Action.Push
                        title="Sort Subtasks"
                        icon={Icon.Switch}
                        shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                        target={<PlanSortView date={date} goalId={item.id} />}
                        onPop={state.reload}
                      />
                    ) : null}
                  </ActionPanel>
                )
              }
            />
          ))
        : null}
    </List>
  );
}

function time(seconds: number): string {
  return seconds > 0 ? formatDuration(seconds) : "—";
}
