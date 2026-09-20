export type ConversationPart = {
  content: string;
  authorName?: string;
};

export type Note = {
  id: string;
  type: "textNote" | "conversationNote" | "opportunityNote";
  fields: {
    name: string;
    content: string | ConversationPart[];
    processed: boolean;
    archived: boolean;
    tags?: { id?: string; name: string }[];
  };
  createdAt: string;
  updatedAt: string;
  links: { self: string; html: string };
};

export type AddNote = {
  title: string;
  content: string;
  saidBy: string;
  tags: string;
};

export type Objective = {
  id: string;
  type: "objective";
  fields: {
    name: string;
    description?: string;
    status?: { id: string; name: string };
    archived?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  links: { self: string; html: string };
};

export type PaginatedResponse<T> = {
  data: T[];
  links: { next: string | null };
};

export type POSTResponse =
  | { data: { id: string; links: { html: string } } }
  | { errors: Array<{ code: string; title: string; detail: string }> };

export type ErrorResponse =
  | { ok: false; errors: { source: string }[] }
  | { message: string }
  | { error: string }
  | { errors: Array<{ code: string; title: string; detail: string }> };
