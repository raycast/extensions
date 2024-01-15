import { useTimeEntryContext } from "../context/TimeEntryContext";

export function revalidateStorage() {
  const context = useTimeEntryContext();
  context.revalidateMe();
  context.revalidateWorkspaces();
  context.revalidateTimeEntries();
  context.revalidateRunningTimeEntry();
  context.revalidateProjects();
  context.revalidateClients();
  context.revalidateTags();
  context.revalidateTasks();
}
