import { MiteClient } from "./client";
import type { MiteTimeEntry, MiteTimeEntryCreate } from "./types";

export async function createTimeEntry(
  data: MiteTimeEntryCreate,
): Promise<MiteTimeEntry> {
  const client = new MiteClient();
  const response = await client.post<{ time_entry: MiteTimeEntry }>(
    "/time_entries.json",
    {
      time_entry: data,
    },
  );
  return response.time_entry;
}

export async function getTimeEntry(id: number): Promise<MiteTimeEntry> {
  const client = new MiteClient();
  const response = await client.get<{ time_entry: MiteTimeEntry }>(
    `/time_entries/${id}.json`,
  );
  return response.time_entry;
}

export async function getTodayTimeEntries(): Promise<MiteTimeEntry[]> {
  const client = new MiteClient();
  // user_id=current ensures we only get entries for the authenticated user
  const response = await client.get<Array<{ time_entry: MiteTimeEntry }>>(
    "/daily.json?user_id=current",
  );

  // Extract time entries from wrapper objects
  return response.map((item) => item.time_entry);
}

export async function getThisWeekTimeEntries(): Promise<MiteTimeEntry[]> {
  const client = new MiteClient();
  // user_id=current ensures we only get entries for the authenticated user
  const response = await client.get<Array<{ time_entry: MiteTimeEntry }>>(
    "/time_entries.json?at=this_week&user_id=current",
  );

  // Extract time entries from wrapper objects
  return response.map((item) => item.time_entry);
}
