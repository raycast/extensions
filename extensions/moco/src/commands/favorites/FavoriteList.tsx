import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import { fetchProjects } from "../projects/api";
import { Project } from "../projects/types";
import { Task } from "../tasks/types";
import { startActivity } from "../activities/api";
import { ActivityStart } from "../activities/components/ActivityStart";
import { getFavoriteOrder, sortByFavoriteOrder, StatusType, storeFavoriteOrder } from "../../utils/storage";
import { useStatuses } from "../../utils/useStatuses";
import { finishMenuBarForm } from "../../utils/refresh";
import { localDate } from "../activities/utils";

type UndoStep = { label: string; order: number[]; removedTaskID?: number };

// All favorite tasks in menu bar order.
// ↵ starts with a description, ⌘↵ starts a timer at once. Changes are stored at once, ⌘Z undoes them.
export const FavoriteList = () => {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  // Undo history of this window: the order before each change, plus the task a change removed.
  const [undoSteps, setUndoSteps] = useState<UndoStep[]>([]);
  const { data: projects = [], isLoading: isLoadingProjects } = useCachedPromise(fetchProjects, [], {
    keepPreviousData: true,
  });
  const { statuses, isLoading: isLoadingStatuses, changeStatus } = useStatuses("task");
  const { data: order = [], isLoading: isLoadingOrder, mutate: mutateOrder } = usePromise(getFavoriteOrder);

  const favorites = sortByFavoriteOrder(
    projects.flatMap((project) =>
      project.tasks
        .filter((task) => task.active !== false && statuses?.get(task.id) === StatusType.favorite)
        .map((task) => ({ project, task })),
    ),
    order,
    ({ task }) => task.id,
  );

  // The stored value is known, so no reload after the write: a reload only makes the list blink.
  // Stored IDs that are not in the list right now (e.g. an inactive task) keep their place after the visible ones.
  const saveOrder = (taskIDs: number[]) => {
    const fullOrder = [...taskIDs, ...order.filter((id) => !taskIDs.includes(id))];
    return mutateOrder(storeFavoriteOrder(fullOrder), {
      optimisticUpdate: () => fullOrder,
      shouldRevalidateAfter: false,
    });
  };

  const remember = (label: string, removedTaskID?: number) => {
    const orderBefore = favorites.map(({ task }) => task.id);
    setUndoSteps((steps) => [...steps, { label, order: orderBefore, removedTaskID }]);
  };

  const undo = async () => {
    const step = undoSteps[undoSteps.length - 1];
    if (step === undefined) {
      return;
    }
    setUndoSteps((steps) => steps.slice(0, -1));
    if (step.removedTaskID !== undefined) {
      setSelectedId(String(step.removedTaskID));
    }
    // Start both updates in the same tick: their optimistic values render together, without a jump.
    await Promise.all([
      saveOrder(step.order),
      step.removedTaskID !== undefined ? changeStatus(step.removedTaskID, StatusType.favorite) : undefined,
    ]);
    await showToast({ style: Toast.Style.Success, title: `Undone: ${step.label}` });
  };

  const remove = async (task: Task) => {
    remember(`Remove "${task.name}"`, task.id);
    await changeStatus(task.id, undefined);
  };

  const start = async (project: Project, task: Task) => {
    const success = await startActivity({
      date: localDate(),
      description: task.name,
      hours: "",
      projectID: project.id,
      taskID: task.id,
    });
    if (success === true) {
      await finishMenuBarForm();
    }
  };

  // Each move is stored at once. The selection follows the moved row.
  const move = async (from: number, to: number) => {
    const taskIDs = favorites.map(({ task }) => task.id);
    const [moved] = taskIDs.splice(from, 1);
    taskIDs.splice(to, 0, moved);
    remember(`Move "${favorites[from].task.name}"`);
    setSelectedId(String(moved));
    await saveOrder(taskIDs);
  };

  return (
    <List
      isLoading={isLoadingProjects || isLoadingStatuses || isLoadingOrder}
      navigationTitle="Manage Favorites"
      searchBarPlaceholder="Filter favorites..."
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      <List.EmptyView title="No favorites" description="Right-click a task in the menu bar → Set to Favorite." />
      {favorites.map(({ project, task }, index) => (
        <List.Item
          key={task.id}
          id={String(task.id)}
          icon={Icon.Star}
          title={task.name}
          subtitle={project.name}
          accessories={[{ text: `${index + 1}` }]}
          actions={
            <ActionPanel>
              {/* Raycast binds the first action to ↵ and the second to ⌘↵. */}
              <Action.Push
                title="Start with Description…"
                icon={Icon.Pencil}
                target={
                  <ActivityStart
                    task={{ ...task, projectID: project.id, projectName: project.name }}
                    onSubmitted={finishMenuBarForm}
                  />
                }
              />
              <Action title="Start Timer" icon={Icon.Play} onAction={() => start(project, task)} />
              <ActionPanel.Section title="Order">
                {undoSteps.length > 0 ? (
                  <Action
                    title={`Undo ${undoSteps[undoSteps.length - 1].label}`}
                    icon={Icon.ArrowCounterClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "z" }}
                    onAction={undo}
                  />
                ) : null}
                {index > 0 ? (
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    onAction={() => move(index, index - 1)}
                  />
                ) : null}
                {index < favorites.length - 1 ? (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    onAction={() => move(index, index + 1)}
                  />
                ) : null}
                {index > 0 ? (
                  <Action
                    title="Move to Top"
                    icon={Icon.ArrowUpCircle}
                    shortcut={{ modifiers: ["shift", "opt"], key: "arrowUp" }}
                    onAction={() => move(index, 0)}
                  />
                ) : null}
                {index < favorites.length - 1 ? (
                  <Action
                    title="Move to Bottom"
                    icon={Icon.ArrowDownCircle}
                    shortcut={{ modifiers: ["shift", "opt"], key: "arrowDown" }}
                    onAction={() => move(index, favorites.length - 1)}
                  />
                ) : null}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Remove from Favorites"
                  icon={Icon.StarDisabled}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  onAction={() => remove(task)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
