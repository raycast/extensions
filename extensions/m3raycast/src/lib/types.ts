// Client types
export interface Client {
  id: number;
  uuid?: string;
  name: string;
  status: string;
  website?: string | null;
  archived?: boolean;
}

// Project types
export interface Project {
  id: number;
  description: string;
  client_id: number | null;
  client_name: string | null;
  category: string | null;
  is_billable: boolean;
  rate: number | null;
  completed: boolean;
}

export interface ProjectCategory {
  id: number;
  name: string;
}

// Member types
export interface Member {
  id: number;
  name: string;
  username: string;
}

// Timer/Event types
export interface Timer {
  id: number;
  project_id: number | null;
  project_description: string | null;
  client_name: string | null;
  member_id: number | null;
  member_name: string | null;
  note: string | null;
  start: string | null;
  minutes_elapsed: number;
}

export interface StoppedTimer {
  id: number;
  project_id: number | null;
  project_description: string | null;
  client_name: string | null;
  member_name: string | null;
  start: string | null;
  stop: string | null;
  duration_minutes: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  result: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface ListClientsResponse extends ApiResponse {
  clients: Client[];
}

export interface CheckClientResponse extends ApiResponse {
  exists: boolean;
  client?: Client;
}

export interface CreateClientResponse extends ApiResponse {
  client?: Client;
  existing_client?: Client;
}

export interface ListProjectsResponse extends ApiResponse {
  projects: Project[];
}

export interface ListCategoriesResponse extends ApiResponse {
  categories: ProjectCategory[];
}

export interface CreateProjectResponse extends ApiResponse {
  project?: {
    id: number;
    description: string;
    client_name: string;
    category: string | null;
    is_billable: boolean;
  };
  timer_started?: boolean;
  event_id?: number;
}

export interface ListMembersResponse extends ApiResponse {
  members: Member[];
}

export interface ListTimersResponse extends ApiResponse {
  timers: Timer[];
}

export interface StartTimerResponse extends ApiResponse {
  event?: {
    id: number;
    project_id: number;
    project_description: string;
    client_name: string | null;
    member_name: string;
    start: string;
  };
}

export interface StopTimerResponse extends ApiResponse {
  event?: StoppedTimer;
}

// Client status options
export const CLIENT_STATUS_OPTIONS = [
  { value: "Potential", title: "Potential" },
  { value: "Potential (Archived)", title: "Potential (Archived)" },
  { value: "Under Development", title: "Under Development" },
  { value: "Hosting", title: "Hosting" },
  { value: "Engaged", title: "Engaged" },
  { value: "Advertising Only", title: "Advertising Only" },
  { value: "Archived", title: "Archived" },
  { value: "Defunct", title: "Defunct" },
  { value: "Lost", title: "Lost" },
];

// Firewall types
export interface Firewall {
  id: string;
  name: string;
  droplet_count: number;
}

export interface WhitelistResult {
  firewall_id: string;
  firewall_name: string;
  success: boolean;
  updated?: boolean;
  ports_updated?: string[];
  message?: string;
  error?: string;
}

export interface ListFirewallsResponse extends ApiResponse {
  firewalls: Firewall[];
}

export interface WhitelistIPResponse extends ApiResponse {
  current_ip?: string;
  results?: WhitelistResult[];
}
