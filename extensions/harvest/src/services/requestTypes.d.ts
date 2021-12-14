type iso = string;
interface NewTimeEntryBase {
  user_id?: number;
  project_id: number | string;
  task_id: number | string;
  spent_date?: iso;
  notes?: string;
  external_reference?: {
    id: string;
    group_id: string;
    account_id: string;
    permalink: string;
  };
}
export interface NewTimeEntryDuration extends NewTimeEntryBase {
  hours?: number; //if blank, is_running will be true
}
export interface NewTimeEntryStartEnd extends NewTimeEntryBase {
  started_time?: string; // defaults to current time
  ended_time?: string; //if blank, is_running will be true
}
