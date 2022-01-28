import {
  ActionPanel,
  ActionPanelItem,
  Form,
  getLocalStorageItem,
  Icon,
  List,
  setLocalStorageItem,
  showToast,
  SubmitFormAction,
  ToastStyle,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import isEmpty from "lodash.isempty";
import uniqWith from "lodash.uniqwith";
import useConfig from "./useConfig";
import { fetcher, isInProgress, showElapsedTime } from "./utils";
import { TimeEntry, Project } from "./types";

function useClock(entry: TimeEntry) {
  const [time, setTime] = useState(showElapsedTime(entry));

  useEffect(() => {
    const interval = setInterval(() => setTime(showElapsedTime(entry)), 1000);
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
      subtitle={`${entry.description || "No Description"}`}
      accessoryTitle={`${time}  -  ${entry.project?.name}`}
      icon={{ source: Icon.Clock, tintColor: entry.project?.color }}
      keywords={[...(entry.description?.split(" ") ?? []), ...(entry.project?.name.split(" ") ?? [])]}
      accessoryIcon={{ source: Icon.Dot, tintColor: entry.project?.color }}
      actions={
        <ActionPanel>
          <ActionPanelItem title="Stop Timer" onAction={() => stopCurrentTimer().then(() => updateTimeEntries())} />
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

      const storedEntries: string | undefined = await getLocalStorageItem("entries");

      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      }

      const filteredEntries = await getTimeEntries({ onError: setIsValidToken });

      if (filteredEntries) {
        setEntries(filteredEntries);
        setLocalStorageItem("entries", JSON.stringify(filteredEntries));
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
          setLocalStorageItem("entries", JSON.stringify(entries));
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
          accessoryTitle={`Go to Extensions → Clockify`}
        />
      ) : (
        <>
          <List.Section title="What are you working on?">
            <List.Item
              icon={{ source: Icon.ArrowRight }}
              title="Start New Timer"
              actions={
                <ActionPanel>
                  <ActionPanel.Item
                    title="Start New Timer"
                    onAction={() => push(<NewEntry updateTimeEntries={updateTimeEntries} />)}
                  />
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
                  subtitle={entry.description || "No Description"}
                  accessoryTitle={entry.project?.name}
                  icon={{ source: Icon.Circle, tintColor: entry.project?.color }}
                  keywords={[...(entry.description?.split(" ") ?? []), ...(entry.project?.name.split(" ") ?? [])]}
                  accessoryIcon={{ source: Icon.Dot, tintColor: entry.project?.color }}
                  actions={
                    <ActionPanel>
                      <ActionPanelItem
                        title="Start Timer"
                        onAction={() => {
                          addNewTimeEntry(entry.description, entry.projectId).then(() => updateTimeEntries());
                        }}
                      />
                    </ActionPanel>
                  }
                />
              )
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { pop } = useNavigation();

  useEffect(() => {
    if (isEmpty(config)) return;

    async function getAllProjectsOnWorkspace(): Promise<void> {
      setIsLoading(true);

      const storedProjects: string | undefined = await getLocalStorageItem("projects");
      if (storedProjects) setProjects(JSON.parse(storedProjects));

      const { data } = await fetcher(`/workspaces/${config.workspaceId}/projects?page-size=1000`);

      setProjects(data || []);
      setLocalStorageItem("projects", JSON.stringify(data));
      setIsLoading(false);
    }

    getAllProjectsOnWorkspace();
  }, [config]);

  return (
    <Form
      navigationTitle="Add new time entry"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <SubmitFormAction
            title="Start"
            onSubmit={({ description, projectId }) => {
              if (description && projectId) {
                addNewTimeEntry(description, projectId).then(() => updateTimeEntries());
                pop();
              } else {
                showToast(ToastStyle.Failure, "All fields are required");
              }
            }}
          />
          <ActionPanelItem title="Discard" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectId" title="Project">
        {projects.map((project: Project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={`${project.name} - ${project?.clientName || "No Client"}`}
            icon={{ source: Icon.Circle, tintColor: project.color }}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="description" defaultValue="" title="Description" />
    </Form>
  );
}

async function getTimeEntries({ onError }: { onError?: (state: boolean) => void }): Promise<TimeEntry[]> {
  const workspaceId = await getLocalStorageItem("workspaceId");
  const userId = await getLocalStorageItem("userId");

  const { data, error } = await fetcher(
    `/workspaces/${workspaceId}/user/${userId}/time-entries?hydrated=true&page-size=500`
  );

  if (error === "Unauthorized") {
    onError && onError(false);
    return [];
  }

  if (data?.length) {
    const filteredEntries: TimeEntry[] = uniqWith(
      data,
      (a: TimeEntry, b: TimeEntry) => a.projectId === b.projectId && a.description === b.description
    );

    return filteredEntries;
  } else {
    return [];
  }
}

async function stopCurrentTimer(): Promise<void> {
  showToast(ToastStyle.Animated, "Stopping…");

  const workspaceId = await getLocalStorageItem("workspaceId");
  const userId = await getLocalStorageItem("userId");

  const { data, error } = await fetcher(`/workspaces/${workspaceId}/user/${userId}/time-entries`, {
    method: "PATCH",
    body: { end: new Date().toISOString() },
  });

  if (!error && data) {
    showToast(ToastStyle.Success, "Timer stopped");
  } else {
    showToast(ToastStyle.Failure, "No timer running");
  }
}

async function addNewTimeEntry(description: string, projectId: string): Promise<void> {
  showToast(ToastStyle.Animated, "Starting…");

  const workspaceId = await getLocalStorageItem("workspaceId");

  const { data } = await fetcher(`/workspaces/${workspaceId}/time-entries`, {
    method: "POST",
    body: {
      description,
      billable: true,
      taskId: null,
      projectId,
      timeInterval: {
        start: new Date().toISOString(),
        end: null,
        duration: null,
      },
      customFieldValues: [],
    },
  });

  if (data?.id) {
    showToast(ToastStyle.Success, "Timer is running");
  } else {
    showToast(ToastStyle.Failure, "Timer could not be started");
  }
}
