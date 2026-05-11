import { apiRequest } from "./api";
import assert from "node:assert";

function pad(input: number) {
  return `${input}`.padStart(2, "0");
}

function toTime(time: Date): string {
  return `${time.getHours()}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;
}

function toDate(time: Date): string {
  return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())}`;
}

export async function getActiveTimesheetEntry({ personId }: { personId: string }): Promise<{ id: string } | null> {
  const { data } = await apiRequest({
    endpoint: "timesheet-entries",
    query: {
      personId,
      endTime: "",
    },
  });

  const timesheetEntriesLength = data.data.length;

  assert(timesheetEntriesLength <= 1);

  return timesheetEntriesLength === 0 ? null : { id: data.data[0].id };
}

export async function clockIn({ personId, time }: { personId: string; time: Date }): Promise<void> {
  await apiRequest({
    method: "POST",
    endpoint: "timesheet-entries",
    body: {
      personId,
      date: toDate(time),
      startTime: toTime(time),
    },
  });
}

export async function clockOut({ timesheetEntryId, time }: { timesheetEntryId: string; time: Date }): Promise<void> {
  await apiRequest({
    method: "PATCH",
    endpoint: `timesheet-entries/${encodeURIComponent(timesheetEntryId)}`,
    body: { endTime: toTime(time) },
  });
}
