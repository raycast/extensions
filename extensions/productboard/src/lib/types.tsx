// Notes
type NoteFeature = {
  id: string;
  type: string;
  importance: number;
};
type NoteFollower = {
  memberId: string;
  memberName: string;
  memberEmail: string;
  teamId: string;
  teamName: string;
};
export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  state: "processed" | "unprocessed";
  displayUrl: string;
  externalDisplayUrl: string | null;
  tags: string[];
  company: {
    id: string;
  };
  features: NoteFeature[];
  followers: NoteFollower[];
  owner: {
    name: string;
    email: string;
  };
  source: {
    origin: string | null;
    record_id: string | null;
  };
  user: null | { id: string };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
};
export type AddNote = {
  title: string;
  content: string;
  saidBy: string;
  tags: string;
};

// OBJECTIVES
export type Objective = {
  id: string;
  name: string;
  description: string;
  level: number | null;
  // parent
  owner: {
    email: string;
  };
  // timeframe
  // state
  status: {
    id: string;
    name: string;
  };
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  links: {
    self: string;
    html: string;
  };
};

// OTHER
export type PageMeta =
  | {
      pageCursor: string | null;
      totalResults: number;
    }
  | {
      links: {
        next: string | null;
      };
    };
export type POSTResponse = {
  links: {
    html: string;
  };
  data: {
    id: string;
  };
};
export type ErrorResponse =
  | {
      ok: false;
      errors: { source: string }[];
    }
  | { message: string }
  | {
      error: string;
    }
  | {
      errors: Array<{
        code: string;
        title: string;
        detail: string;
      }>;
    };
