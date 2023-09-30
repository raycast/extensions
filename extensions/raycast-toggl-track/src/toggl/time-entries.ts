import { showHUD } from "@raycast/api";
import { DateTime } from "luxon";
import Toggl, { ITimeEntry } from "toggl-track";
import { Project } from "./project";
import { stopTogglTimeEntry } from "./client";

function reduceEntries(acc: ITimeEntry[], curr: ITimeEntry): Array<ITimeEntry> {
  if (!Array.isArray(acc)) {
    throw new Error("Initial value must be an array");
  }

  const existing = acc.some((item) => item.description === curr.description);

  if (!existing) {
    acc.push(curr);
  }

  return acc;
}

async function fetchRecentTimeEntries(client: Toggl): Promise<Array<ITimeEntry>> {
  const end = DateTime.now().toISO() ?? "";
  const start = DateTime.now().minus({ weeks: 4 }).endOf("day").toISO() ?? "";

  const timeEntries = await client.timeEntry.list({
    startDate: start,
    endDate: end,
  });

  const distinctTimeEntries = timeEntries.reduce(reduceEntries, []);

  return distinctTimeEntries;
}

async function createNewTimeEntryForProject(project: Project, description: string, client: Toggl): Promise<ITimeEntry> {
  const entry_start_time = DateTime.now().toUTC().toISO({ includeOffset: true }) ?? "";
  const entry_start_date = DateTime.now().toISODate() ?? "";

  const new_entry = await client.timeEntry.create(project.workspace_id, {
    billable: true,
    created_with: "Raycast Toggle Addon",
    description: description,
    duration: -1,
    project_id: project.id,
    start: entry_start_time,
    start_date: entry_start_date,
    user_id: project.user_id,
    workspace_id: project.workspace_id,
  });

  return new_entry;
}

async function createNewTimeEntryFromOldTimeEntry(timeEntry: ITimeEntry, client: Toggl): Promise<ITimeEntry> {
  const entry_start_time = DateTime.now().toUTC().toISO() ?? "";
  const entry_start_date = DateTime.now().toISODate() ?? "";

  const workspace_id = timeEntry.workspace_id ?? 0;

  const new_entry = await client.timeEntry.create(workspace_id, {
    billable: true,
    created_with: "Raycast Toggl Extension",
    description: timeEntry.description,
    duration: -1,
    project_id: timeEntry.project_id,
    start: entry_start_time,
    start_date: entry_start_date,
    user_id: timeEntry.user_id,
    workspace_id: timeEntry.workspace_id,
  });

  return new_entry;
}

async function hasTimeEntryRunning(client: Toggl): Promise<ITimeEntry> {
  const activeEntry = await client.timeEntry.current();

  return activeEntry;
}

async function stopRunningTimeEntry(client: Toggl): Promise<ITimeEntry> {
  const activeEntry = await hasTimeEntryRunning(client);

  if (activeEntry) {
    const stopped = await stopTogglTimeEntry(activeEntry.workspace_id, activeEntry.id);
    if(!stopped){
        showHUD("🤦‍♂️ stopping failed!");
    }
  }

  return activeEntry;
}

export {
  fetchRecentTimeEntries,
  createNewTimeEntryForProject,
  createNewTimeEntryFromOldTimeEntry,
  hasTimeEntryRunning,
  stopRunningTimeEntry,
};
