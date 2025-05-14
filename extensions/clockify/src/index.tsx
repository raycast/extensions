import { ActionPanel, Form, Icon, List, showToast, useNavigation, Toast, Action } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import isEmpty from "lodash.isempty";
import useConfig from "./useConfig";
import {
  isInProgress,
  getElapsedTime,
  getTimeEntries,
  stopCurrentTimer,
  addNewTimeEntry,
  getAllTimeEntriesFromLocalStorage,
  getProjects,
  getTasksForProject,
} from "./utils";
import { TimeEntry, Project, Task } from "./types";

function OpenWebPage() {
  return <Action.OpenInBrowser title="Open Website" url="https://app.clockify.me" />;
}

function useClock(entry: TimeEntry) {
  const [time, setTime] = useState(getElapsedTime(entry));

  useEffect(() => {
    const interval = setInterval(() => setTime(getElapsedTime(entry)), 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

function ItemInProgress({ entry, updateTimeEntries }: { entry: TimeEntry; updateTimeEntries: () => void }) {
  const time = useClock(entry);

  return (
    <List.Item
      id={entry.id}
      title={entry.project?.clientName || "No Client"}
      subtitle={`${[entry.description || "No Description", entry.task?.name].filter(Boolean).join(" • ")}`}
      accessories={[
        { text: `${time}  -  ${entry.project?.name}`, icon: { source: Icon.Dot, tintColor: entry.project?.color } },
      ]}
      icon={{ source: Icon.Clock, tintColor: entry.project?.color }}
      keywords={[...(entry.description?.split(" ") ?? []), ...(entry.project?.name.split(" ") ?? [])]}
      actions={
        <ActionPanel>
          <Action title="Stop Timer" onAction={() => stopCurrentTimer(updateTimeEntries)} />
          <OpenWebPage />
        </ActionPanel>
      }
    />
  );
}

export default function Main() {
  const { config, isValidToken, setIsValidToken } = useConfig();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { push } = useNavigation();

  useEffect(() => {
    if (isEmpty(config) || !isValidToken) return;

    async function fetchTimeEntries() {
      setIsLoading(true);

      const storedEntries = getAllTimeEntriesFromLocalStorage();
      if (storedEntries.length > 0) {
        setEntries(storedEntries);
      }

      const filteredEntries = await getTimeEntries({ onError: setIsValidToken });

      if (filteredEntries) {
        setEntries(filteredEntries);
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
        />
      ) : (
        <>
          <List.Section title="What are you working on?">
            <List.Item
              icon={{ source: Icon.ArrowRight }}
              title="Start New Timer"
              actions={
                <ActionPanel>
                  <Action
                    title="Start New Timer"
                    onAction={() => push(<NewEntry updateTimeEntries={updateTimeEntries} />)}
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
                  ]}
                  icon={{ source: Icon.Circle, tintColor: entry.project?.color }}
                  keywords={[...(entry.description?.split(" ") ?? []), ...(entry.project?.name.split(" ") ?? [])]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Start Timer"
                        onAction={() => {
                          addNewTimeEntry(entry.description, entry.projectId, entry.taskId, updateTimeEntries);
                        }}
                      />
                      <OpenWebPage />
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
  const { config, isValidToken, setIsValidToken } = useConfig();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { pop } = useNavigation();

  useEffect(() => {
    if (isEmpty(config) || !isValidToken) return;

    async function fetchProjects(): Promise<void> {
      setIsLoading(true);

      const projectsData = await getProjects({ onError: setIsValidToken });
      setProjects(projectsData);

      setIsLoading(false);
    }

    fetchProjects();
  }, [config, isValidToken]);

  return (
    <Form
      navigationTitle="Add new time entry"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start"
            onSubmit={({ description, projectId, taskId }) => {
              if (projectId) {
                addNewTimeEntry(description, projectId, taskId === "-1" ? null : taskId, () => {
                  updateTimeEntries();
                  pop();
                });
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
        onChange={async (projectId) => {
          setIsLoading(true);
          const tasksData = await getTasksForProject(projectId);
          setTasks(tasksData);
          setIsLoading(false);
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
            <Form.Dropdown.Item key={-1} value={"-1"} title={"Without task"} icon={{ source: Icon.TextDocument }} />
          </Form.Dropdown.Section>

          <Form.Dropdown.Section title="Project tasks">
            {tasks.map((task: Task) => (
              <Form.Dropdown.Item
                key={task.id}
                value={task.id}
                title={task.name}
                icon={{ source: Icon.TextDocument }}
              />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      ) : null}

      <Form.TextField id="description" defaultValue="" title="Description" autoFocus />
    </Form>
  );
}
