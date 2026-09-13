import {
  Icon,
  MenuBarExtra,
  open,
  launchCommand,
  LaunchType,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getCurrentIteration, getPlannerItems } from "./lib/ado";
import {
  getPlan,
  getDeferredSet,
  getManualTodos,
  getStatusMap,
} from "./lib/storage";
import { orderItems, projectPlan, remainingWorkingDays } from "./lib/plan";
import { LocalStatus, ManualTodo, Preferences, WorkItem } from "./lib/types";

export default function SprintMenuBar() {
  const includeBacklog =
    getPreferenceValues<Preferences>().includeBacklog !== false;
  const { data, isLoading } = useCachedPromise(
    async (backlog: boolean) => {
      const [iteration, items, plan, statusMap, deferred, notes] =
        await Promise.all([
          getCurrentIteration(),
          getPlannerItems(backlog),
          getPlan(),
          getStatusMap(),
          getDeferredSet(),
          getManualTodos(),
        ]);
      const statusOf = (id: number): LocalStatus =>
        statusMap.get(id) ?? "not-started";
      const byId = new Map<number, WorkItem>(items.map((i) => [i.id, i]));
      const openItems = items.filter(
        (i) => !deferred.has(i.id) && statusOf(i.id) !== "done",
      );
      const defaultOrder = orderItems(openItems, statusOf);
      const openSorted = defaultOrder
        .map((id) => byId.get(id))
        .filter((x): x is WorkItem => Boolean(x));
      const capacity =
        parseInt(getPreferenceValues<Preferences>().dailyCapacity || "3", 10) ||
        3;
      const days = remainingWorkingDays(
        iteration.startDate,
        iteration.finishDate,
      );
      const remaining = projectPlan(
        plan?.order ?? defaultOrder,
        openSorted,
        days,
        capacity,
      ).todays;
      return { remaining, notes };
    },
    [includeBacklog],
  );

  const remaining = data?.remaining ?? [];
  const notes: ManualTodo[] = data?.notes ?? [];
  const total = remaining.length + notes.length;
  const title = isLoading ? undefined : `${total}`;

  return (
    <MenuBarExtra
      icon={Icon.Gauge}
      title={title}
      tooltip="Sprint — items left today"
    >
      <MenuBarExtra.Section
        title={total ? `${total} left today` : "All clear today"}
      >
        {remaining.map((item) => (
          <MenuBarExtra.Item
            key={item.id}
            title={`#${item.id} ${item.title}`}
            onAction={() => open(item.url)}
          />
        ))}
      </MenuBarExtra.Section>
      {notes.length > 0 && (
        <MenuBarExtra.Section title="Quick Notes">
          {notes.map((note) => (
            <MenuBarExtra.Item
              key={note.id}
              icon={Icon.Pencil}
              title={note.text}
              onAction={() =>
                launchCommand({ name: "today", type: LaunchType.UserInitiated })
              }
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Today's To-Do"
          icon={Icon.List}
          onAction={() =>
            launchCommand({ name: "today", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title="Open My Sprint"
          icon={Icon.List}
          onAction={() =>
            launchCommand({ name: "my-sprint", type: LaunchType.UserInitiated })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
