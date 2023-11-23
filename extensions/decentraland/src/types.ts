export interface DecentralandResponse<T> {
  data: T[];
  ok: boolean;
}

export interface Event {
  id: string;
  name: string;
  image: string;
  description: string;
  start_at: string;
  finish_at: string;
  coordinates: number[];
  user: string;
  approved: boolean;
  created_at: string;
  updated_at: string;
  total_attendees: number;
  latest_attendees: string[];
  url: string;
  scene_name: string;
  user_name: string;
  rejected: boolean;
  trending: boolean;
  server: string | null;
  estate_id: string;
  estate_name: string;
  x: number;
  y: number;
  all_day: boolean;
  recurrent: boolean;
  recurrent_frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  recurrent_weekday_mask: number;
  recurrent_month_mask: number;
  recurrent_interval: number;
  recurrent_count: number | null;
  recurrent_until: string;
  duration: number;
  recurrent_dates: string[];
  recurrent_setpos: any | null;
  recurrent_monthday: any | null;
  highlighted: boolean;
  next_start_at: string;
  next_finish_at: string;
  categories: string[];
  schedules: any[];
  approved_by: string;
  rejected_by: any | null;
  attending: boolean;
  notify: boolean;
  position: number[];
  live: boolean;
}

export interface District {
  id: string;
  name: string;
  description: string;
  parcels: string[];
  totalParcels: number;
}
