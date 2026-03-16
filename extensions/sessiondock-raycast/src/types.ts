export type SessionDockEnvelope<T> = {
  data: T;
};

export type SessionDockError = {
  error?: {
    code?: string;
    message?: string;
    status?: number;
  };
};

export type Session = {
  id: string;
  title: string;
  kind?: string;
  status?: string;
  tags?: string[];
  notes?: string | null;
  lastOpened?: string;
};

export type ImportRequest = {
  kind: string;
  generatePreviews?: boolean;
  items: Array<{
    path: string;
    title?: string;
  }>;
};
