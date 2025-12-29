import {
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  useNavigation,
  Toast,
  Action,
  LocalStorage,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import isEmpty from "lodash.isempty";
import uniqWith from "lodash.uniqwith";
import useConfig from "./useConfig";
import { fetcher, isInProgress, showElapsedTime, dateDiffToString } from "./utils";
import { TimeEntry, Project, Task, Tag } from "./types";
import { useCachedState } from "@raycast/utils";

function OpenWebPage() {
  return <Action.OpenInBrowser title="Open Website" url="https://app.clockify.me" />;
}

function ToggleTags() {
  const [, setIsShowingTags] = useCachedState<boolean>("show-tags");
  return (
    <Action
      icon={Icon.Tag}
      title="Toggle Tags"
      onAction={() => setIsShowingTags((show) => !show)}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
    />
  );
}

function useClock(entry: TimeEntry) {
  const [time, setTime] = useState(showElapsedTime(entry));

  useEffect(() => {
    const interval = setInterval(() => setTime(showElapsedTime(entry)), 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

function ItemInProgress({ entry, updateTimeEntries }: { entry: TimeEntry; updateTimeEntries: () => void }) {
  const [isShowingTags] = useCachedState<boolean>("show-tags");
  const time = useClock(entry);

  return (
    <List.Item
      id={entry.id}
      title={entry.project?.clientName || "No Client"}
      subtitle={`${[entry.description || "No Description", entry.task?.name].filter(Boolean).join(" • ")}`}
      accessories={[
        { text: `${time}  -  ${entry.project?.name}`, icon: { source: Icon.Dot, tintColor: entry.project?.color } },
        ...(isShowingTags ? entry.tags.map((tag) => ({ tag: tag.name })) : []),
      ]}
      icon={{ source: Icon.Clock, tintColor: entry.project?.color }}
      keywords={[...(entry.description?.split(" ") ?? []), ...(entry.project?.name.split(" ") ?? [])]}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Stop}
            title="Stop Timer"
            onAction={() => stopCurrentTimer().then(() => updateTimeEntries())}
          />
          <Action.Push
            icon={Icon.Clock}
            title="Stop Timer at…"
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            target={<StopTimerAtForm entry={entry} updateTimeEntries={updateTimeEntries} />}
          />
          <OpenWebPage />
          <ToggleTags />
        </ActionPanel>
      }
    />
  );
}

export default function Main() {
  const { config, isValidToken, setIsValidToken } = useConfig();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isShowingTags] = useCachedState<boolean>("show-tags");

  useEffect(() => {
    if (isEmpty(config) || !isValidToken) return;

    async function fetchTimeEntries() {
      setIsLoading(true);

      const storedEntries: string | undefined = await LocalStorage.getItem("entries");

      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      }

      const filteredEntries = await getTimeEntries({ onError: setIsValidToken });

      if (filteredEntries) {
        setEntries(filteredEntries);
        LocalStorage.setItem("entries", JSON.stringify(filteredEntries));
      }

      setIsLoading(false);
    }

    fetchTimeEntries();
  }, [config, isValidToken]);

  const updateTimeEntries = useCallback((): void => {
    setIsLoading(true);

    getTimeEntries({ onError: setIsValidToken })
      .then((entries) => {
        if (entries) {
          setEntries(entries);
          LocalStorage.setItem("entries", JSON.stringify(entries));
        }

        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [getTimeEntries]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search time entries">
      {!isValidToken ? (
        <List.Item
          icon={Icon.ExclamationMark}
          title="Invalid API Key Detected"
          accessories={[{ text: `Go to Extensions → Clockify` }]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="What are you working on?">
            <List.Item
              icon={{ source: Icon.ArrowRight }}
              title="Start New Timer"
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.ArrowRight}
                    title="Start New Timer"
                    target={<NewEntry updateTimeEntries={updateTimeEntries} />}
                  />
                  <OpenWebPage />
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.Plus }}
              title="Add Time Entry"
              subtitle="Add a completed entry with start and end times"
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add Time Entry"
                    target={<AddTimeEntry updateTimeEntries={updateTimeEntries} />}
                  />
                  <OpenWebPage />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Latest entries">
            {entries.map((entry) =>
              isInProgress(entry) ? (
                <ItemInProgress key={entry.id} entry={entry} updateTimeEntries={updateTimeEntries} />
              ) : (
                <List.Item
                  id={entry.id}
                  key={entry.id}
                  title={entry.project?.clientName || "No Client"}
                  subtitle={`${[entry.description || "No Description", entry.task?.name].filter(Boolean).join(" • ")}`}
                  accessories={[
                    { text: entry.project?.name, icon: { source: Icon.Dot, tintColor: entry.project?.color } },
                    ...(isShowingTags ? entry.tags.map((tag) => ({ tag: tag.name })) : []),
                  ]}
                  icon={{ source: Icon.Circle, tintColor: entry.project?.color }}
                  keywords={[...(entry.description?.split(" ") ?? []), ...(entry.project?.name.split(" ") ?? [])]}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.Play}
                        title="Start Timer"
                        onAction={() => {
                          addNewTimeEntry(
                            entry.description,
                            entry.projectId,
                            entry.taskId,
                            entry.tags.map((tag) => tag.id),
                          ).then(() => updateTimeEntries());
                        }}
                      />
                      <OpenWebPage />
                      <ToggleTags />
                    </ActionPanel>
                  }
                />
              ),
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}

function NewEntry({ updateTimeEntries }: { updateTimeEntries: () => void }) {
  const { config } = useConfig();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { pop } = useNavigation();

  useEffect(() => {
    if (isEmpty(config)) return;

    async function getAllProjectsAndTagsOnWorkspace(): Promise<void> {
      setIsLoading(true);

      const [storedProjects, storedTags] = await Promise.all([
        LocalStorage.getItem<string>("projects"),
        LocalStorage.getItem<string>("tags"),
      ]);
      if (storedProjects) setProjects(JSON.parse(storedProjects));
      if (storedTags) setTags(JSON.parse(storedTags));

      const [projectsResponse, tagsResponse] = await Promise.all([
        fetcher(`/workspaces/${config.workspaceId}/projects?page-size=1000&archived=false`),
        fetcher(`/workspaces/${config.workspaceId}/tags?page-size=1000&archived=false`),
      ]);

      setProjects(projectsResponse.data || []);
      LocalStorage.setItem("projects", JSON.stringify(projectsResponse.data));
      setTags(tagsResponse.data || []);
      LocalStorage.setItem("tags", JSON.stringify(tagsResponse.data));
      setIsLoading(false);
    }

    getAllProjectsAndTagsOnWorkspace();
  }, [config]);

  return (
    <Form
      navigationTitle="Add new time entry"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start"
            onSubmit={({ description, projectId, taskId, tagIds, startTime }) => {
              if (projectId) {
                addNewTimeEntry(description, projectId, taskId === "-1" ? null : taskId, tagIds, startTime).then(
                  updateTimeEntries,
                );
                pop();
              } else {
                showToast(Toast.Style.Failure, "Project is required.");
              }
            }}
          />
          <Action.SubmitForm title="Discard" onSubmit={pop} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="projectId"
        title="Project"
        onChange={(projectId) => {
          async function getAllTasksForProject(projectId: string): Promise<void> {
            setIsLoading(true);

            const storedTasks: string | undefined = await LocalStorage.getItem(`project[${projectId}]`);
            if (storedTasks) setTasks(JSON.parse(storedTasks));

            const { data } = await fetcher(
              `/workspaces/${config.workspaceId}/projects/${projectId}/tasks?page-size=1000`,
            );

            setTasks(data || []);
            LocalStorage.setItem(`project[${projectId}]`, JSON.stringify(data));
            setIsLoading(false);
          }

          getAllTasksForProject(projectId);
        }}
      >
        {projects.map((project: Project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={`${project.name} - ${project?.clientName || "No Client"}`}
            icon={{ source: Icon.Circle, tintColor: project.color }}
          />
        ))}
      </Form.Dropdown>

      {tasks.length ? (
        <Form.Dropdown id="taskId" title="Task">
          <Form.Dropdown.Section>
            <Form.Dropdown.Item key={-1} value={"-1"} title={"Without task"} icon={{ source: Icon.BlankDocument }} />
          </Form.Dropdown.Section>

          <Form.Dropdown.Section title="Project tasks">
            {tasks.map((task: Task) => (
              <Form.Dropdown.Item
                key={task.id}
                value={task.id}
                title={task.name}
                icon={{ source: Icon.BlankDocument }}
              />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      ) : null}

      <Form.TextField id="description" title="Description" placeholder="What are you working on?" autoFocus />

      <Form.Separator />

      <Form.DatePicker
        id="startTime"
        title="Start Time (optional)"
        type={Form.DatePicker.Type.DateTime}
        max={new Date()}
      />

      <Form.TagPicker title="Tags (optional)" id="tagIds" placeholder="Search tags">
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} title={tag.name} value={tag.id} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function StopTimerAtForm({ entry, updateTimeEntries }: { entry: TimeEntry; updateTimeEntries: () => void }) {
  const { pop } = useNavigation();
  const [endDate, setEndDate] = useState<Date>(new Date());
  const startTime = new Date(entry.timeInterval.start);

  async function stopTimerAt(endTime: Date): Promise<void> {
    if (endTime <= startTime) {
      showToast(
        Toast.Style.Failure,
        "End time must be after start time",
        `Timer started at ${startTime.toLocaleTimeString()}`,
      );
      return;
    }

    if (endTime > new Date()) {
      showToast(Toast.Style.Failure, "End time cannot be in the future");
      return;
    }

    showToast(Toast.Style.Animated, "Stopping timer...");

    const workspaceId = await LocalStorage.getItem("workspaceId");
    const userId = await LocalStorage.getItem("userId");

    const { data, error } = await fetcher(`/workspaces/${workspaceId}/user/${userId}/time-entries`, {
      method: "PATCH",
      body: { end: endTime.toISOString() },
    });

    if (!error && data) {
      showToast(Toast.Style.Success, "Timer stopped", `Ended at ${endTime.toLocaleTimeString()}`);
      updateTimeEntries();
      pop();
    } else {
      showToast(Toast.Style.Failure, "Failed to stop timer");
    }
  }

  return (
    <Form
      navigationTitle="Stop Timer at"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Stop Timer" onSubmit={({ endDate }) => stopTimerAt(endDate)} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Current Timer"
        text={`${entry.project?.name || "No Project"} - ${entry.description || "No Description"}`}
      />
      <Form.Description title="Started at" text={startTime.toLocaleString()} />
      <Form.Separator />
      <Form.DatePicker
        id="endDate"
        title="Stop at"
        type={Form.DatePicker.Type.DateTime}
        value={endDate}
        onChange={(date) => date && setEndDate(date)}
        min={startTime}
        max={new Date()}
      />
    </Form>
  );
}

function AddTimeEntry({ updateTimeEntries }: { updateTimeEntries: () => void }) {
  const { config } = useConfig();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { pop } = useNavigation();

  const defaultStart = new Date();
  defaultStart.setHours(defaultStart.getHours() - 1);
  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(new Date());

  useEffect(() => {
    if (isEmpty(config)) return;

    async function getAllProjectsAndTags(): Promise<void> {
      setIsLoading(true);

      const [storedProjects, storedTags] = await Promise.all([
        LocalStorage.getItem<string>("projects"),
        LocalStorage.getItem<string>("tags"),
      ]);
      if (storedProjects) setProjects(JSON.parse(storedProjects));
      if (storedTags) setTags(JSON.parse(storedTags));

      const [projectsResponse, tagsResponse] = await Promise.all([
        fetcher(`/workspaces/${config.workspaceId}/projects?page-size=1000&archived=false`),
        fetcher(`/workspaces/${config.workspaceId}/tags?page-size=1000&archived=false`),
      ]);

      setProjects(projectsResponse.data || []);
      LocalStorage.setItem("projects", JSON.stringify(projectsResponse.data));
      setTags(tagsResponse.data || []);
      LocalStorage.setItem("tags", JSON.stringify(tagsResponse.data));
      setIsLoading(false);
    }

    getAllProjectsAndTags();
  }, [config]);

  async function addCompletedTimeEntry(values: {
    projectId: string;
    taskId?: string;
    description?: string;
    tagIds?: string[];
  }): Promise<void> {
    const { projectId, taskId, description, tagIds } = values;

    if (!projectId) {
      showToast(Toast.Style.Failure, "Project is required");
      return;
    }

    if (endDate <= startDate) {
      showToast(Toast.Style.Failure, "End time must be after start time");
      return;
    }

    if (endDate > new Date()) {
      showToast(Toast.Style.Failure, "End time cannot be in the future");
      return;
    }

    showToast(Toast.Style.Animated, "Adding time entry...");

    const workspaceId = await LocalStorage.getItem("workspaceId");

    const { data, error } = await fetcher(`/workspaces/${workspaceId}/time-entries`, {
      method: "POST",
      body: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        description: description || null,
        taskId: taskId === "-1" ? null : taskId || null,
        projectId,
        tagIds: tagIds || [],
        customFieldValues: [],
      },
    });

    if (data?.id) {
      const duration = dateDiffToString(startDate, endDate);
      showToast(Toast.Style.Success, "Time entry added", `Duration: ${duration}`);
      updateTimeEntries();
      pop();
    } else {
      showToast(Toast.Style.Failure, "Failed to add time entry", error?.toString());
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Time Entry"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Entry" onSubmit={addCompletedTimeEntry} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="projectId"
        title="Project"
        onChange={(projectId) => {
          async function getAllTasksForProject(projectId: string): Promise<void> {
            setIsLoading(true);

            const storedTasks: string | undefined = await LocalStorage.getItem(`project[${projectId}]`);
            if (storedTasks) setTasks(JSON.parse(storedTasks));

            const { data } = await fetcher(
              `/workspaces/${config.workspaceId}/projects/${projectId}/tasks?page-size=1000`,
            );

            setTasks(data || []);
            LocalStorage.setItem(`project[${projectId}]`, JSON.stringify(data));
            setIsLoading(false);
          }

          getAllTasksForProject(projectId);
        }}
      >
        {projects.map((project: Project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={`${project.name} - ${project?.clientName || "No Client"}`}
            icon={{ source: Icon.Circle, tintColor: project.color }}
          />
        ))}
      </Form.Dropdown>

      {tasks.length > 0 && (
        <Form.Dropdown id="taskId" title="Task">
          <Form.Dropdown.Section>
            <Form.Dropdown.Item key={-1} value={"-1"} title="Without task" icon={{ source: Icon.BlankDocument }} />
          </Form.Dropdown.Section>
          <Form.Dropdown.Section title="Project tasks">
            {tasks.map((task: Task) => (
              <Form.Dropdown.Item
                key={task.id}
                value={task.id}
                title={task.name}
                icon={{ source: Icon.BlankDocument }}
              />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      )}

      <Form.TextField id="description" title="Description" placeholder="What were you working on?" />

      <Form.Separator />

      <Form.DatePicker
        id="startDate"
        title="Start Time"
        type={Form.DatePicker.Type.DateTime}
        value={startDate}
        onChange={(date) => date && setStartDate(date)}
      />

      <Form.DatePicker
        id="endDate"
        title="End Time"
        type={Form.DatePicker.Type.DateTime}
        value={endDate}
        onChange={(date) => date && setEndDate(date)}
        max={new Date()}
      />

      <Form.Separator />

      <Form.TagPicker title="Tags (optional)" id="tagIds" placeholder="Search tags">
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} title={tag.name} value={tag.id} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

async function getTimeEntries({ onError }: { onError?: (state: boolean) => void }): Promise<TimeEntry[]> {
  const workspaceId = await LocalStorage.getItem("workspaceId");
  const userId = await LocalStorage.getItem("userId");

  const { data, error } = await fetcher(
    `/workspaces/${workspaceId}/user/${userId}/time-entries?hydrated=true&page-size=500`,
  );

  if (error === "Unauthorized") {
    onError?.(false);
    return [];
  }

  if (data?.length) {
    return uniqWith(
      data,
      (a: TimeEntry, b: TimeEntry) =>
        a.projectId === b.projectId && a.taskId === b.taskId && a.description === b.description,
    );
  } else {
    return [];
  }
}

async function stopCurrentTimer(): Promise<void> {
  showToast(Toast.Style.Animated, "Stopping…");

  const workspaceId = await LocalStorage.getItem("workspaceId");
  const userId = await LocalStorage.getItem("userId");

  const { data, error } = await fetcher(`/workspaces/${workspaceId}/user/${userId}/time-entries`, {
    method: "PATCH",
    body: { end: new Date().toISOString() },
  });

  if (!error && data) {
    showToast(Toast.Style.Success, "Timer stopped");
  } else {
    showToast(Toast.Style.Failure, "No timer running");
  }
}

async function addNewTimeEntry(
  description: string | undefined | null,
  projectId: string,
  taskId: string | undefined | null,
  tagIds: string[] = [],
  startTime?: Date,
): Promise<void> {
  showToast(Toast.Style.Animated, "Starting…");

  const workspaceId = await LocalStorage.getItem("workspaceId");

  const { data } = await fetcher(`/workspaces/${workspaceId}/time-entries`, {
    method: "POST",
    body: {
      start: (startTime || new Date()).toISOString(),
      description,
      taskId,
      projectId,
      tagIds,
      customFieldValues: [],
    },
  });

  if (data?.id) {
    showToast(Toast.Style.Success, "Timer is running");
  } else {
    showToast(Toast.Style.Failure, "Timer could not be started");
  }
}
