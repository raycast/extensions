import { Customer } from "../customers/types";
import { Project } from "../projects/types";
import { Task } from "../tasks/types";
import { User } from "../user/types";
import { StatusType } from "../utils/storage";

export type Activity = {
  id: number;
  date: string;
  hours: number;
  seconds: number;
  description: string;
  billed: boolean;
  invoice_id: number;
  billable: boolean;
  tag: string;
  remote_service: string;
  remote_id: string;
  remote_url: string;
  project: Project;
  task: Task;
  customer: Customer;
  user: User;
  hourly_rate?: number;
  timer_started_at: string | null;
  created_at: string;
  updated_at: string;
  status?: StatusType;
};
