export type Workspace = {
  default: boolean;
  forms?: {
    count: number;
    href: string;
  };
  id: string;
  name: string;
  account_id: string;
  self: {
    href: string;
  };
  shared: boolean;
};

export type WorkspacesResponse = {
  items: Workspace[];
};

export type FormOverview = {
  id: string;
  title: string;
  last_updated_at: string;
  created_at: string;
  settings: {
    is_public: boolean;
  };
  self: {
    href: string;
  };
  theme: {
    href: string;
  };
  _links: {
    display: string;
  };
};

export type FormsResponse = {
  items: FormOverview[];
};

export type InsightsResponse = {
  Metrics: {
    totals: {
      segmented_views: {
        open: number;
        private: number;
        closed: number;
      };
      submission_starts: number;
      submissions: number;
      completion_rate: number;
      average_time_to_complete: 0;
    };
  };
};

export type FormDefinition = {
  id: string;
  title: string;
  settings: {
    language: string;
  };
  fields: unknown[];
  published_at: string;
};
