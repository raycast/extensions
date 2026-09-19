import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  type LaunchProps,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { LabelsView, ProjectsView } from "./project-management";
import { requestMenuBarRefresh } from "./raycast-commands";
import {
  DELAYED_COMPLETION_POLICY,
  TaskLifecycleInteraction,
  type TaskLifecycleHistoryState,
  type TaskLifecycleMutationKind,
} from "./shared/application/task-lifecycle-interaction";
import { loadTaskView, normalizeTaskView, type TaskView } from "./shared/application/task-views";
import { openProductionWorktodo, type WorktodoSession } from "./shared/application/worktodo";
import type { Label, Project, Task } from "./shared/domain/model";
import { taskLifecycleHistoryTitle, taskLifecycleMutationPresentation } from "./shared/presentation/task-lifecycle";
import { parseMyTasksLaunchContext, type MyTasksLaunchContext } from "./shared/presentation/task-launch";
import { taskListRowPresentation } from "./shared/presentation/task-list";
import { EditLabelsForm, MoveTaskForm, TaskForm } from "./task-form";
import {
  buildTaskViewSections,
  initialProjectIdForTaskView,
  lifecycleActionForTaskView,
  TaskViewDropdown,
  taskViewContent,
  taskViewKey,
  type TaskListSection,
} from "./task-views";
import { taskLifecycleHistoryActionPresentation } from "./task-lifecycle-raycast";
import { PRIORITY_TINT, taskListIcon } from "./task-priority-raycast";

type ListState = {
  isLoading: boolean;
  error: string | null;
  mutationError: string | null;
  taskSections: TaskListSection[];
  projects: Project[];
  labels: Label[];
};

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred";
}

function TaskHistoryAction({
  state,
  onAction,
}: {
  state: TaskLifecycleHistoryState;
  onAction: (state: TaskLifecycleHistoryState) => Promise<void>;
}) {
  const presentation = taskLifecycleHistoryActionPresentation(state);
  return (
    <Action
      title={presentation.title}
      icon={presentation.icon}
      shortcut={presentation.shortcut}
      onAction={() => onAction(state)}
    />
  );
}

export default function Command(props: LaunchProps<{ launchContext?: MyTasksLaunchContext }>) {
  const [launchContext] = useState(() => parseMyTasksLaunchContext(props.launchContext));
  const [view, setView] = useState<TaskView>(() => ({ kind: launchContext.view }));
  const [selectedTaskId, setSelectedTaskId] = useState(launchContext.selectedTaskId);
  const [isShowingDetail, setIsShowingDetail] = useState(launchContext.isShowingDetail);
  const [viewerTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [session, setSession] = useState<WorktodoSession | null>(null);
  const [acknowledgedTasks, setAcknowledgedTasks] = useState<ReadonlyMap<string, Task>>(() => new Map());
  const [taskHistoryState, setTaskHistoryState] = useState<TaskLifecycleHistoryState | null>(null);
  const lifecycle = useRef<TaskLifecycleInteraction | null>(null);
  const refreshRef = useRef<() => void>(() => undefined);
  const performTaskHistoryRef = useRef<(state: TaskLifecycleHistoryState) => Promise<void>>(async () => undefined);
  const didOpenCreateTask = useRef(false);
  const didOpenEditTask = useRef(false);
  const { push } = useNavigation();
  const [state, setState] = useState<ListState>({
    isLoading: true,
    error: null,
    mutationError: null,
    taskSections: [],
    projects: [],
    labels: [],
  });

  useEffect(() => {
    let opened: WorktodoSession | null = null;
    try {
      opened = openProductionWorktodo();
      setSession(opened);
    } catch (error) {
      setState({
        isLoading: false,
        error: messageFrom(error),
        mutationError: null,
        taskSections: [],
        projects: [],
        labels: [],
      });
    }
    return () => opened?.close();
  }, []);

  const refresh = useCallback(() => {
    if (!session) {
      return;
    }
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const projects = session.service.listProjects();
      const labels = session.service.listLabels();
      const nextView = normalizeTaskView(view, projects, labels);
      if (taskViewKey(nextView) !== taskViewKey(view)) {
        lifecycle.current?.clearAcknowledgements();
        setIsShowingDetail(false);
        setView(nextView);
      }
      setState({
        isLoading: false,
        error: null,
        mutationError: null,
        taskSections: buildTaskViewSections(
          loadTaskView(session.service, nextView, { evaluationInstantMs: Date.now(), viewerTimeZone }),
          projects,
          labels,
        ),
        projects,
        labels,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: messageFrom(error),
        mutationError: null,
        taskSections: [],
      }));
    }
  }, [session, view, viewerTimeZone]);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!session) {
      return;
    }
    const interaction = new TaskLifecycleInteraction({
      mutations: session.service,
      policy: DELAYED_COMPLETION_POLICY,
      refresh: {
        refreshView: () => refreshRef.current(),
        refreshRelated: requestMenuBarRefresh,
      },
      onAcknowledgementsChanged: setAcknowledgedTasks,
      onHistoryChanged: setTaskHistoryState,
    });
    lifecycle.current = interaction;
    return () => {
      if (lifecycle.current === interaction) {
        lifecycle.current = null;
      }
      interaction.dispose();
    };
  }, [session]);

  useEffect(() => refresh(), [refresh]);

  const refreshAfterUnrelatedMutation = useCallback(() => {
    lifecycle.current?.refreshAfterExternalMutation();
  }, []);

  const reportMutationFailure = useCallback(async (title: string, error: unknown) => {
    const message = messageFrom(error);
    setState((current) => ({ ...current, isLoading: false, mutationError: message }));
    await showToast(Toast.Style.Failure, title, message);
  }, []);

  const showHistoryToast = useCallback(async (title: string, message: string, nextState: TaskLifecycleHistoryState) => {
    await showToast({
      style: Toast.Style.Success,
      title,
      message,
      primaryAction: {
        title: taskLifecycleHistoryTitle(nextState),
        onAction: () => void performTaskHistoryRef.current(nextState),
      },
    });
  }, []);

  const performTaskHistory = useCallback(
    async (expected: TaskLifecycleHistoryState) => {
      const interaction = lifecycle.current;
      if (!interaction) {
        return;
      }

      const result = interaction.runHistory(expected);
      if (result.status === "unavailable") {
        await showToast(
          Toast.Style.Failure,
          expected.direction === "undo" ? "Undo no longer available" : "Redo no longer available",
          expected.taskTitle,
        );
        return;
      }
      if (result.status === "failed") {
        await reportMutationFailure(
          expected.direction === "undo" ? "Unable to undo task" : "Unable to redo task",
          result.error,
        );
        return;
      }
      if (result.status === "duplicate") {
        return;
      }

      setState((value) => ({ ...value, mutationError: null }));
      if (expected.direction === "undo") {
        setSelectedTaskId(expected.taskId);
      }
      const presentation = taskLifecycleMutationPresentation(result.operation);
      await showHistoryToast(presentation.successTitle, result.task.title, result.history);
    },
    [reportMutationFailure, showHistoryToast],
  );
  performTaskHistoryRef.current = performTaskHistory;

  const performLifecycleMutation = useCallback(
    async (operation: TaskLifecycleMutationKind, taskId: string) => {
      const interaction = lifecycle.current;
      if (!interaction) {
        return;
      }

      const result = interaction.runMutation(operation, taskId);
      if (result.status === "failed") {
        await reportMutationFailure(taskLifecycleMutationPresentation(operation).failureTitle, result.error);
        return;
      }
      if (result.status === "duplicate") {
        return;
      }

      setState((current) => ({ ...current, mutationError: null }));
      const presentation = taskLifecycleMutationPresentation(result.operation);
      if (result.history) {
        await showHistoryToast(presentation.successTitle, result.task.title, result.history);
      } else {
        await showToast(Toast.Style.Success, presentation.successTitle);
      }
    },
    [reportMutationFailure, showHistoryToast],
  );

  useEffect(() => {
    if (!launchContext.createTask || didOpenCreateTask.current || !session || state.isLoading || state.error) {
      return;
    }
    didOpenCreateTask.current = true;
    push(
      <TaskForm
        service={session.service}
        projects={state.projects}
        labels={state.labels}
        initialProjectId={null}
        viewerTimeZone={viewerTimeZone}
        onSaved={refreshAfterUnrelatedMutation}
      />,
    );
  }, [
    launchContext.createTask,
    push,
    refreshAfterUnrelatedMutation,
    session,
    state.error,
    state.isLoading,
    state.labels,
    state.projects,
    viewerTimeZone,
  ]);

  useEffect(() => {
    const taskId = launchContext.selectedTaskId;
    if (!launchContext.editTask || !taskId || didOpenEditTask.current || !session || state.isLoading || state.error) {
      return;
    }

    didOpenEditTask.current = true;
    try {
      const task = session.service.getTask(taskId);
      if (task.trashedAtMs !== null) {
        throw new Error("Task is in trash");
      }
      push(
        <TaskForm
          service={session.service}
          task={task}
          projects={state.projects}
          labels={state.labels}
          initialProjectId={task.projectId}
          viewerTimeZone={viewerTimeZone}
          onSaved={refreshAfterUnrelatedMutation}
        />,
      );
    } catch (error) {
      void showToast(Toast.Style.Failure, "Unable to edit task", messageFrom(error));
    }
  }, [
    launchContext.editTask,
    launchContext.selectedTaskId,
    push,
    refreshAfterUnrelatedMutation,
    session,
    state.error,
    state.isLoading,
    state.labels,
    state.projects,
    viewerTimeZone,
  ]);

  const content = taskViewContent(view, state.projects, state.labels);
  const taskCount = state.taskSections.reduce((count, section) => count + section.items.length, 0);
  const createTarget = session ? (
    <TaskForm
      service={session.service}
      projects={state.projects}
      labels={state.labels}
      initialProjectId={initialProjectIdForTaskView(view)}
      viewerTimeZone={viewerTimeZone}
      onSaved={refreshAfterUnrelatedMutation}
    />
  ) : null;
  const projectsTarget = session ? (
    <ProjectsView service={session.service} onChanged={refreshAfterUnrelatedMutation} />
  ) : null;
  const labelsTarget = session ? (
    <LabelsView service={session.service} onChanged={refreshAfterUnrelatedMutation} />
  ) : null;

  const changeView = useCallback((nextView: TaskView) => {
    lifecycle.current?.clearAcknowledgements();
    setSelectedTaskId(undefined);
    setIsShowingDetail(false);
    setView(nextView);
  }, []);

  return (
    <List
      isLoading={state.isLoading}
      isShowingDetail={isShowingDetail}
      selectedItemId={state.isLoading ? undefined : selectedTaskId}
      onSelectionChange={(id) => {
        if (id !== null) {
          setSelectedTaskId(id);
        }
      }}
      searchBarPlaceholder={content.searchPlaceholder}
      searchBarAccessory={
        <TaskViewDropdown view={view} projects={state.projects} labels={state.labels} onChange={changeView} />
      }
    >
      {state.error ? (
        <List.EmptyView icon={Icon.Warning} title="Unable to open Worktodo" description={state.error} />
      ) : (
        <>
          <List.EmptyView
            icon={content.icon}
            title={taskCount === 0 ? content.emptyTitle : "No matching tasks"}
            description={taskCount === 0 ? content.emptyDescription : "Try a different search."}
            actions={
              createTarget || projectsTarget || labelsTarget || taskHistoryState ? (
                <ActionPanel>
                  {createTarget ? <Action.Push title="New Task" icon={Icon.Plus} target={createTarget} /> : null}
                  {projectsTarget ? (
                    <Action.Push title="Manage Projects" icon={Icon.Folder} target={projectsTarget} />
                  ) : null}
                  {labelsTarget ? <Action.Push title="Manage Labels" icon={Icon.Tag} target={labelsTarget} /> : null}
                  {taskHistoryState ? (
                    <TaskHistoryAction state={taskHistoryState} onAction={performTaskHistory} />
                  ) : null}
                </ActionPanel>
              ) : undefined
            }
          />
          {state.taskSections.map((taskSection, sectionIndex) => (
            <List.Section
              key={taskSection.key}
              title={
                sectionIndex === 0 && state.mutationError
                  ? `Action failed: ${state.mutationError} — ${taskSection.title}`
                  : taskSection.title
              }
            >
              {taskSection.items.map((item) => {
                const lifecycleAction = session ? lifecycleActionForTaskView(view) : null;
                const row = taskListRowPresentation(item, acknowledgedTasks.get(item.id));
                return (
                  <List.Item
                    key={item.id}
                    id={item.id}
                    icon={taskListIcon(view, row.isCompletionAcknowledged)}
                    title={row.title}
                    subtitle={isShowingDetail ? undefined : item.subtitle}
                    keywords={item.keywords}
                    accessories={
                      isShowingDetail && !row.isCompletionAcknowledged
                        ? undefined
                        : row.accessories.map((accessory) =>
                            accessory.kind === "tag"
                              ? {
                                  tag:
                                    accessory.style === "priority"
                                      ? { value: accessory.text, color: PRIORITY_TINT }
                                      : accessory.text,
                                }
                              : { text: accessory.text },
                          )
                    }
                    detail={
                      <List.Item.Detail
                        markdown={item.detail.markdown}
                        metadata={
                          <List.Item.Detail.Metadata>
                            {item.detail.metadata.map((field) => (
                              <List.Item.Detail.Metadata.Label
                                key={field.title}
                                title={field.title}
                                text={field.text}
                              />
                            ))}
                            {item.detail.labels.length > 0 ? (
                              <List.Item.Detail.Metadata.TagList title="Labels">
                                {item.detail.labels.map((label) => (
                                  <List.Item.Detail.Metadata.TagList.Item key={label} text={label} />
                                ))}
                              </List.Item.Detail.Metadata.TagList>
                            ) : null}
                            {item.detail.links.map((url, index) => (
                              <List.Item.Detail.Metadata.Link
                                key={url}
                                title={index === 0 ? "Link" : `Link ${index + 1}`}
                                text={url}
                                target={url}
                              />
                            ))}
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      session && lifecycleAction ? (
                        <ActionPanel>
                          <Action
                            title={isShowingDetail ? "Hide Details" : "Show Details"}
                            icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
                            onAction={() => setIsShowingDetail((current) => !current)}
                          />
                          {/* Raycast reserves Command-Return for the second action and rejects it as an explicit shortcut. */}
                          <Action
                            title={lifecycleAction.title}
                            icon={lifecycleAction.icon}
                            onAction={() => performLifecycleMutation(lifecycleAction.kind, item.id)}
                          />
                          {taskHistoryState ? (
                            <TaskHistoryAction state={taskHistoryState} onAction={performTaskHistory} />
                          ) : null}
                          {item.detail.links.map((url, index) => (
                            <Action.OpenInBrowser
                              key={url}
                              title={index === 0 ? "Open Link" : `Open Link ${index + 1}`}
                              url={url}
                            />
                          ))}
                          {view.kind !== "trash" ? (
                            <Action.Push
                              title="Edit Task"
                              icon={Icon.Pencil}
                              shortcut={Keyboard.Shortcut.Common.Edit}
                              target={
                                <TaskForm
                                  service={session.service}
                                  task={item.task}
                                  projects={state.projects}
                                  labels={state.labels}
                                  initialProjectId={item.task.projectId}
                                  viewerTimeZone={viewerTimeZone}
                                  onSaved={refreshAfterUnrelatedMutation}
                                />
                              }
                            />
                          ) : null}
                          {item.task.trashedAtMs === null ? (
                            <Action.Push
                              title="Edit Labels"
                              icon={Icon.Tag}
                              target={
                                <EditLabelsForm
                                  service={session.service}
                                  task={item.task}
                                  labels={state.labels}
                                  onSaved={refreshAfterUnrelatedMutation}
                                />
                              }
                            />
                          ) : null}
                          {view.kind !== "trash" ? (
                            <Action.Push
                              title="Move Task"
                              icon={Icon.ArrowRight}
                              target={
                                <MoveTaskForm
                                  service={session.service}
                                  task={item.task}
                                  projects={state.projects}
                                  onSaved={refreshAfterUnrelatedMutation}
                                />
                              }
                            />
                          ) : null}
                          {createTarget ? (
                            <Action.Push
                              title="New Task"
                              icon={Icon.Plus}
                              shortcut={Keyboard.Shortcut.Common.New}
                              target={createTarget}
                            />
                          ) : null}
                          {projectsTarget ? (
                            <Action.Push title="Manage Projects" icon={Icon.Folder} target={projectsTarget} />
                          ) : null}
                          {labelsTarget ? (
                            <Action.Push title="Manage Labels" icon={Icon.Tag} target={labelsTarget} />
                          ) : null}
                          {view.kind !== "trash" ? (
                            <Action
                              title="Move to Trash"
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              shortcut={Keyboard.Shortcut.Common.Remove}
                              onAction={() => performLifecycleMutation("trash", item.id)}
                            />
                          ) : null}
                          <Action
                            title="Refresh"
                            icon={Icon.ArrowClockwise}
                            shortcut={Keyboard.Shortcut.Common.Refresh}
                            onAction={refresh}
                          />
                        </ActionPanel>
                      ) : undefined
                    }
                  />
                );
              })}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}
