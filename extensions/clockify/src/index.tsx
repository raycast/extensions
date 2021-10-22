import {
  ActionPanel,
  ActionPanelItem,
  Detail,
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
import useToken from "./useToken";
import { fetcher, isInProgress } from "./utils";
import { TimeEntry, Project } from "./types";

export default function Main() {
  const isValidToken = useToken();
  const { config } = useConfig();
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

      const filteredEntries = await getTimeEntries();

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

    getTimeEntries()
      .then((entries) => {
        if (entries) {
          setEntries(entries);
          setLocalStorageItem("entries", JSON.stringify(entries));
        }

        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [getTimeEntries]);

  if (!isValidToken) {
    return <Detail markdown={`Invalid token.`} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search time entries">
      <List.Section title="Manual">
        <List.Item
          icon="▶️"
          title="Start timer"
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Start New Timer"
                onAction={() => push(<NewEntry updateTimeEntries={updateTimeEntries} />)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon="⏹️"
          title="Stop current"
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Stop current timer"
                onAction={async () => {
                  stopCurrentTimer().then(() => updateTimeEntries());
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Latest entries">
        {entries.map((entry) => (
          <List.Item
            id={entry.id}
            key={entry.id}
            title={entry.project?.clientName || "No Client"}
            subtitle={entry.description}
            accessoryTitle={entry.project?.name}
            icon={{ source: isInProgress(entry) ? Icon.Clock : Icon.Circle, tintColor: entry.project?.color }}
            keywords={[...entry.description.split(" "), ...entry.project?.name.split(" ")]}
            accessoryIcon={{ source: Icon.Dot, tintColor: entry.project?.color }}
            actions={
              <ActionPanel>
                <ActionPanelItem
                  title="Start timer"
                  onAction={() => {
                    addNewTimeEntry(entry.description, entry.projectId).then(() => updateTimeEntries());
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
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
            title={`${project.name} - ${project.clientName}`}
            icon={{ source: Icon.Circle, tintColor: project.color }}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="description" defaultValue="" title="Description" />
    </Form>
  );
}

async function getTimeEntries(): Promise<TimeEntry[]> {
  const workspaceId = await getLocalStorageItem("workspaceId");
  const userId = await getLocalStorageItem("userId");

  const { data } = await fetcher(`/workspaces/${workspaceId}/user/${userId}/time-entries?hydrated=true&page-size=500`);

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
