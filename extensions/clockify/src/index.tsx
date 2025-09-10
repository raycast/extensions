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
import { fetcher, isInProgress, showElapsedTime } from "./utils";
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
            onSubmit={({ description, projectId, taskId, tagIds }) => {
              if (projectId) {
                addNewTimeEntry(description, projectId, taskId === "-1" ? null : taskId, tagIds).then(
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
      <Form.TagPicker title="Tags (optional)" id="tagIds" placeholder="Search tags">
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} title={tag.name} value={tag.id} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export async function getTimeEntries({ onError }: { onError?: (state: boolean) => void }): Promise<TimeEntry[]> {
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
    const filteredEntries: TimeEntry[] = uniqWith(
      data,
      (a: TimeEntry, b: TimeEntry) =>
        a.projectId === b.projectId && a.taskId === b.taskId && a.description === b.description,
    );

    return filteredEntries;
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
): Promise<void> {
  showToast(Toast.Style.Animated, "Starting…");

  const workspaceId = await LocalStorage.getItem("workspaceId");

  const { data } = await fetcher(`/workspaces/${workspaceId}/time-entries`, {
    method: "POST",
    body: {
      description,
      taskId,
      projectId,
      timeInterval: {
        start: new Date().toISOString(),
        end: null,
        duration: null,
      },
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
