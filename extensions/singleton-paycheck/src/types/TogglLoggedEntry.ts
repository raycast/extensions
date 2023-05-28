export default interface TogglLoggedEntry {
  id: number;
  workspace_id: number;
  project_id: number;
  task_id: null;
  billable: true;
  start: string;
  stop: string;
  duration: number;
  description: string;
}
