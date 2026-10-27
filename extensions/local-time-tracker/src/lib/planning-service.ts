import {
  getPlannedItem,
  planForDate,
  isPlanComplete,
  isPlanDate,
  latestPlanDateBefore,
  localDateKey,
  nextPlanUpdatedAt,
  parsePlanContent,
  replaceDayTasks,
} from "./planning";
import { withReminderOperation } from "./reminder-service";
import { deletePlan, getActiveTimer, getPlan, getPlans, getProjects, savePlan, savePlanOrder } from "./storage";
import type { SavedPlan, PlanReference } from "./types";

export async function requirePlan(id: string): Promise<SavedPlan> {
  const goal = await getPlan(id);
  if (!goal) throw new Error("This plan no longer exists. Reload Today's Plan.");
  return goal;
}

export type PlanDraft = {
  id?: string;
  expectedUpdatedAt?: string;
  date: string;
  content: string;
  projectId: string;
};

export type PlanMove = PlanReference & { date: string; targetId: string; placement: "before" | "after" };

export async function movePlannedItemToToday(
  move: PlanReference & { date: string; expectedUpdatedAt: string },
): Promise<{ date: string; focus: PlanReference }> {
  return withReminderOperation(async () => {
    const today = localDateKey(new Date());
    if (!isPlanDate(move.date) || move.date >= today) throw new Error("Select an unfinished item from a past date");
    const goal = await requirePlan(move.goalId);
    if (goal.updatedAt !== move.expectedUpdatedAt) throw new Error("The plan has changed. Reload Today's Plan.");
    const visible = planForDate(goal, move.date);
    if (!visible) throw new Error("This item has already moved. Reload Today's Plan.");
    const item = getPlannedItem(visible, move);
    if (move.taskId ? !!item.completedAt : isPlanComplete(visible))
      throw new Error("Only unfinished items can move to today");
    await savePlan(movedPlan(goal, visible, today, move.taskId));
    return { date: today, focus: { goalId: goal.id, ...(move.taskId ? { taskId: move.taskId } : {}) } };
  });
}

export async function importLatestPlansToToday(expectedDate?: string): Promise<{ date: string; count: number }> {
  return withReminderOperation(async () => {
    const today = localDateKey(new Date());
    const goals = await getPlans();
    const sourceDate = latestPlanDateBefore(goals, today);
    if (!sourceDate && !expectedDate) return { date: today, count: 0 };
    if (!sourceDate || sourceDate !== expectedDate)
      throw new Error("The latest plan date has changed. Reload Today's Plan and try again.");
    const source = (await getPlans(sourceDate)).filter((goal) => !isPlanComplete(goal));
    if (!source.length) return { date: today, count: 0 };
    const current = await getPlans(today);
    // Reserve positions first: a failed write can be retried without losing plan order.
    await savePlanOrder(today, [...new Set([...current.map((goal) => goal.id), ...source.map((goal) => goal.id)])]);
    let count = 0;
    try {
      for (const visible of source) {
        const goal = goals.find((item) => item.id === visible.id)!;
        await savePlan(movedPlan(goal, visible, today));
        count++;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${count} ${count === 1 ? "plan" : "plans"} imported from ${sourceDate}. Retry to import the remaining plans. ${reason}`,
      );
    }
    return { date: today, count };
  });
}

function movedPlan(goal: SavedPlan, visible: SavedPlan, today: string, taskId?: string): SavedPlan {
  const ids = new Set(visible.tasks.filter((task) => !taskId || task.id === taskId).map((task) => task.id));
  return {
    ...goal,
    date: goal.tasks.length ? goal.date : today,
    previousDates: [...new Set([...(goal.previousDates ?? []), visible.date])],
    tasks: goal.tasks.map((task) => (ids.has(task.id) ? { ...task, date: today } : task)),
    updatedAt: nextPlanUpdatedAt(goal.updatedAt),
  };
}

export async function reorderPlannedItem(move: PlanMove): Promise<void> {
  await withReminderOperation(async () => {
    const goal = await requirePlan(move.goalId);
    const visible = planForDate(goal, move.date);
    if (!visible) throw new Error("The plan has changed. Reload Today's Plan.");
    // Resolve relative to the latest siblings under the lock so concurrent edits
    // cannot lose newly added tasks, their completion state, or timer references.
    const siblings = move.taskId ? visible.tasks : await getPlans(move.date);
    const sourceId = move.taskId ?? goal.id;
    if (!siblings.some((item) => item.id === sourceId) || !siblings.some((item) => item.id === move.targetId))
      throw new Error("This item no longer exists in the same group. Reload Today's Plan.");
    if (sourceId === move.targetId) return;
    const ids = siblings.map((item) => item.id).filter((id) => id !== sourceId);
    ids.splice(ids.indexOf(move.targetId) + (move.placement === "after" ? 1 : 0), 0, sourceId);
    if (ids.every((id, index) => id === siblings[index].id)) return;
    if (move.taskId) {
      await savePlan({
        ...goal,
        tasks: replaceDayTasks(
          goal,
          move.date,
          ids.map((id) => visible.tasks.find((item) => item.id === id)!),
        ),
        updatedAt: nextPlanUpdatedAt(goal.updatedAt),
      });
    } else {
      await savePlanOrder(move.date, ids);
    }
  });
}

export async function savePlanDraft(draft: PlanDraft): Promise<SavedPlan> {
  return withReminderOperation(async () => {
    const previous = draft.id ? await requirePlan(draft.id) : undefined;
    if (previous && previous.updatedAt !== draft.expectedUpdatedAt)
      throw new Error("The plan has changed. Reopen the editor.");
    if (!isPlanDate(draft.date)) throw new Error("Enter a valid date");
    const visible = previous ? planForDate(previous, draft.date) : undefined;
    if (previous && !visible) throw new Error("The plan has changed. Reopen the editor.");
    const parsed = parsePlanContent(draft.content, visible?.tasks);
    const title = parsed.title;
    const hidden = previous?.tasks.filter((task) => !visible?.tasks.some((item) => item.id === task.id)) ?? [];
    if (hidden.length && !parsed.tasks.length)
      throw new Error(
        "This goal also has subtasks on other dates. Keep a subtask, or delete this day's goal and add a new standalone goal.",
      );
    const dayTasks = parsed.tasks.map((task) =>
      previous && previous.date !== draft.date ? { ...task, date: draft.date } : task,
    );
    const tasks = previous ? replaceDayTasks(previous, draft.date, dayTasks) : dayTasks;
    const project = (await getProjects()).find((item) => item.id === draft.projectId);
    if (!project || (!project.isActive && previous?.projectId !== project.id))
      throw new Error("Select an active project");
    const timer = await getActiveTimer();
    if (previous && timer?.plan?.goalId === previous.id && previous.projectId !== project.id) {
      throw new Error("Stop the plan's timer before changing its project");
    }
    if (previous && timer?.plan?.goalId === previous.id && !timer.plan.taskId && tasks.length) {
      throw new Error("Stop this plan's timer before adding subtasks");
    }
    if (
      previous &&
      timer?.plan?.goalId === previous.id &&
      timer.plan.taskId &&
      !tasks.some((task) => task.id === timer.plan?.taskId)
    ) {
      throw new Error("Stop this task's timer before removing its line");
    }
    const now = new Date();
    const goal: SavedPlan = {
      ...previous,
      id: previous?.id ?? crypto.randomUUID(),
      date: tasks.length ? (previous?.date ?? draft.date) : draft.date,
      title,
      projectId: project.id,
      tasks,
      completedAt: tasks.length ? undefined : previous?.completedAt,
      createdAt: previous?.createdAt ?? now.toISOString(),
      updatedAt: nextPlanUpdatedAt(previous?.updatedAt, now),
    };
    await savePlan(goal);
    return goal;
  });
}

export async function removePlannedItem(
  reference: PlanReference,
  date?: string,
  expectedUpdatedAt?: string,
): Promise<void> {
  await withReminderOperation(async () => {
    const goal = await requirePlan(reference.goalId);
    if (expectedUpdatedAt !== undefined && goal.updatedAt !== expectedUpdatedAt)
      throw new Error("The plan has changed. Reopen the editor.");
    const visible = date ? planForDate(goal, date) : goal;
    if (!visible) throw new Error("The plan has changed. Reload Today's Plan.");
    getPlannedItem(visible, reference);
    const removing = new Set(reference.taskId ? [reference.taskId] : visible.tasks.map((task) => task.id));
    const timer = await getActiveTimer();
    if (timer?.plan?.goalId === goal.id && (timer.plan.taskId ? removing.has(timer.plan.taskId) : !reference.taskId)) {
      throw new Error("Stop this task's timer before deleting it");
    }
    const remaining = goal.tasks.filter((task) => !removing.has(task.id));
    if (!reference.taskId && !remaining.length) await deletePlan(goal.id);
    else
      await savePlan({
        ...goal,
        date: remaining.length ? goal.date : (date ?? goal.date),
        tasks: remaining,
        completedAt: undefined,
        updatedAt: nextPlanUpdatedAt(goal.updatedAt),
      });
  });
}
