export interface Preferences {
  domain: string;
  apiKey: string;
}

export interface Ticket {
  id: number;
  subject: string;
  description: string;
  description_text?: string;
  status: number;
  priority: number;
  requester_id: number;
  responder_id?: number | null;
  created_at: string;
  updated_at: string;
  type: string;
  due_by: string;
  fr_due_by: string;
  is_escalated: boolean;
  source: number;
  requester?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    mobile: string | null;
    phone: string | null;
  };
  // Add other fields as necessary
}

export interface Conversation {
  id: number;
  body: string; // HTML content
  body_text: string; // Plain text content
  incoming: boolean;
  private: boolean;
  user_id: number;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: number; // 1: Open, 2: In Progress, 3: Completed
  due_date: string;
  owner_id: number;
}

export enum TicketStatus {
  Open = 2,
  Pending = 3,
  Resolved = 4,
  Closed = 5,
}

export enum TicketPriority {
  Low = 1,
  Medium = 2,
  High = 3,
  Urgent = 4,
}

export const StatusOptions = [
  { value: TicketStatus.Open, title: "Open" },
  { value: TicketStatus.Pending, title: "Pending" },
  { value: TicketStatus.Resolved, title: "Resolved" },
  { value: TicketStatus.Closed, title: "Closed" },
];

export const PriorityOptions = [
  { value: TicketPriority.Low, title: "Low" },
  { value: TicketPriority.Medium, title: "Medium" },
  { value: TicketPriority.High, title: "High" },
  { value: TicketPriority.Urgent, title: "Urgent" },
];

export interface CreateTicketPayload {
  subject: string;
  description: string;
  email: string;
  priority: number;
  status: number;
}

export interface Requester {
  id: number;
  first_name: string;
  last_name: string;
  primary_email: string;
  job_title?: string;
  work_phone_number?: string;
  mobile_phone_number?: string;
  department_ids?: number[];
  is_agent?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: number;
  display_id: number;
  name: string;
  asset_type_id: number;
  asset_tag?: string;
  user_id?: number;
  assigned_on?: string;
  created_at: string;
  updated_at: string;
}
