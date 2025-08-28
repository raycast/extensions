enum Status {
  BLANK = "BLANK",
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  DELETED = "DELETED",
}
export interface Form {
  id: string;
  name: string;
  status: Status;
  updatedAt: string;
}

interface Member {
  id: string;
}
interface Invite {
  id: string;
}
export interface Workspace {
  id: string;
  name: string | null;
  members: Member[];
  invites: Invite[];
}

interface Question {
  id: string;
  title: string;
}
type Value = string | number | boolean | Record<string, unknown>;
interface TallyResponse {
  questionId: string;
  answer: Value | Value[];
}
interface Submission {
  id: string;
  responses: TallyResponse[];
}
export interface SubmissionResult {
  page: number;
  limit: number;
  hasMore: boolean;
  totalNumberOfSubmissionsPerFilter: {
    all: number;
    completed: number;
    partial: number;
  };
  questions: Question[];
  submissions: Submission[];
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
