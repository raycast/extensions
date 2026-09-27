export type DueValue =
  { kind: "none" } | { kind: "allDay"; date: string } | { kind: "timed"; instantMs: number; timeZone: string };

export type Project = {
  id: string;
  name: string;
  position: number;
  createdAtMs: number;
  updatedAtMs: number;
};

export type Label = {
  id: string;
  name: string;
  position: number;
  createdAtMs: number;
  updatedAtMs: number;
};

export type Task = {
  id: string;
  title: string;
  notes: string;
  priority: boolean;
  position: number;
  projectId: string | null;
  labelIds: string[];
  due: DueValue;
  createdAtMs: number;
  updatedAtMs: number;
  completedAtMs: number | null;
  trashedAtMs: number | null;
};

export type DomainErrorCode =
  "INVALID_ARGUMENT" | "INVALID_DUE_VALUE" | "INVALID_PROJECT" | "NOT_FOUND" | "TASK_TRASHED";

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
