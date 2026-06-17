import { post, patch } from "@/api/timecrowdClient";

interface TimeEntryParams {
  task: {
    title: string;
    key: string;
    parent_id: number;
    team_id: number;
  };
}

export const createTimeEntry = (params: TimeEntryParams) => {
  return post("/api/v1/time_entries", params);
};

export const stopTimeEntry = (timeEntryId: number) => {
  return patch(`/api/v1/time_entries/${timeEntryId}`);
};
