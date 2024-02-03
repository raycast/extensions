import { createContext, useContext, useEffect, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { Me, Workspace, TimeEntry, Project, Client, Tag, Task } from "../api";
import {
  useEffectWithCachedDeps,
  useMe,
  useWorkspaces,
  useTimeEntries,
  useRunningTimeEntry,
  useProjects,
  useClients,
  useTags,
  useTasks,
} from "../hooks";
import { createProjectGroups, ProjectGroup } from "../helpers/createProjectGroups";
import { useExtensionContext } from "./ExtensionContext";

interface TimeEntryContextProps {
  isLoading: boolean;
  me: Me | null;
  workspaces: Workspace[];
  timeEntries: TimeEntry[];
  runningTimeEntry: TimeEntry | null;
  projects: Project[];
  clients: Client[];
  tags: Tag[];
  tasks: Task[];
  projectGroups: ProjectGroup[];
  revalidateMe: () => void;
  revalidateWorkspaces: () => void;
  revalidateTimeEntries: () => void;
  revalidateRunningTimeEntry: () => void;
  revalidateProjects: () => void;
  revalidateClients: () => void;
  revalidateTags: () => void;
  revalidateTasks: () => void;
}

const TimeEntryContext = createContext<TimeEntryContextProps>({
  isLoading: true,
  me: null,
  workspaces: [],
  timeEntries: [],
  runningTimeEntry: null,
  projects: [],
  clients: [],
  tags: [],
  tasks: [],
  projectGroups: [],
  revalidateMe: () => {},
  revalidateWorkspaces: () => {},
  revalidateTimeEntries: () => {},
  revalidateRunningTimeEntry: () => {},
  revalidateProjects: () => {},
  revalidateClients: () => {},
  revalidateTags: () => {},
  revalidateTasks: () => {},
});

export const useTimeEntryContext = () => useContext(TimeEntryContext);

export function TimeEntryContextProvider({ children }: { children: JSX.Element }) {
  const { me, meError, isLoadingMe, revalidateMe } = useMe();
  const { workspaces, workspacesError, isLoadingWorkspaces, revalidateWorkspaces } = useWorkspaces();
  const { timeEntries, timeEntriesError, isLoadingTimeEntries, revalidateTimeEntries } = useTimeEntries();
  const { runningTimeEntry, runningTimeEntryError, isLoadingRunningTimeEntry, revalidateRunningTimeEntry } =
    useRunningTimeEntry();
  const { projects, projectsError, isLoadingProjects, revalidateProjects } = useProjects(workspaces);
  const { clients, clientsError, isLoadingClients, revalidateClients } = useClients(workspaces);
  const { tags, tagsError, isLoadingTags, revalidateTags } = useTags(workspaces);
  const { tasks, tasksError, isLoadingTasks, revalidateTasks } = useTasks(workspaces);

  const [projectGroups, setProjectGroups] = useCachedState<ProjectGroup[]>("projectGroups", []);

  useEffectWithCachedDeps(
    () => {
      const projectGroups = createProjectGroups(projects, workspaces, clients);
      setProjectGroups(projectGroups);
    },
    [projects, workspaces, clients],
    toggleArrayIsEqual,
  );

  const isLoadingArray = [
    isLoadingMe,
    isLoadingWorkspaces,
    isLoadingProjects,
    isLoadingClients,
    isLoadingRunningTimeEntry,
    isLoadingTimeEntries,
    isLoadingTags,
    isLoadingTasks,
  ];
  const isLoading = useMemo(() => isLoadingArray.every((b) => b), isLoadingArray);

  const { setTokenValidity } = useExtensionContext();
  const errorArray = [
    meError,
    workspacesError,
    timeEntriesError,
    runningTimeEntryError,
    projectsError,
    clientsError,
    tagsError,
    tasksError,
  ];
  useEffect(() => {
    if (errorArray.find((err) => err?.message.includes("403"))) setTokenValidity(false);
  }, errorArray);

  return (
    <TimeEntryContext.Provider
      value={{
        isLoading,
        me,
        workspaces,
        timeEntries,
        runningTimeEntry,
        projects,
        clients,
        tags,
        tasks,
        projectGroups,
        revalidateMe,
        revalidateWorkspaces,
        revalidateTimeEntries,
        revalidateRunningTimeEntry,
        revalidateProjects,
        revalidateClients,
        revalidateTags,
        revalidateTasks,
      }}
    >
      {children}
    </TimeEntryContext.Provider>
  );
}

function toggleArrayIsEqual<T extends { id: number }[]>(original: T, updated: T) {
  return original.length === updated.length && original.every((item, i) => item.id == updated[i].id);
}
