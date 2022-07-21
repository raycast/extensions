export interface TimeEntry {
  id: number;
  date_at: string;
  minutes: number;
  note: string;
  customer_name: string;
  project_id: number;
  project_name: string;
  service_id: number;
  service_name: string;
  tracking?: {
    since: string;
    minutes: number;
  };
  //locked: false; // can only be set by admin anyways
}
