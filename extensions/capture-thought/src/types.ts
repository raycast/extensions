export interface ThoughtInput {
  text: string;
  context?: "clipboard" | "selection" | "dictation";
}

export interface AIClassification {
  title: string;
  description: string;
  type: ThoughtType;
  priority: Priority;
  category: Category;
  dueDate?: string;
}

export interface NotionThought {
  id: string;
  title: string;
  type: ThoughtType;
  priority: Priority;
  category: Category;
  dueDate?: string;
  status: Status;
  created: string;
  health?: number;
  description?: string;
}

export type ThoughtType =
  | "Task"
  | "Idea"
  | "Concern"
  | "Decision"
  | "Question"
  | "Note";
export type Priority = "Urgent" | "High" | "Medium" | "Low";
export type Category = "Work" | "Personal";
export type Status = "To Do" | "In Progress" | "Completed";

export interface ServerConfig {
  baseUrl: string;
  port: number;
}

export interface CreateThoughtRequest {
  title: string;
  description: string;
  type: ThoughtType;
  priority: Priority;
  category: Category;
  dueDate?: string;
  rawInput?: {
    text: string;
    source?: string;
    timestamp?: string;
  };
}

export interface DraftResponse {
  classification: AIClassification;
}

export interface CreateResponse {
  success: boolean;
  id?: string;
  error?: string;
}

export interface PrioritiesResponse {
  thoughts: NotionThought[];
}
