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
  fields: Array<{
    id: string;
    title: string;
    ref: string;
    type: string;
  }>;
  published_at: string;
};

type Answer = {
  field: {
    id: string;
    type: string;
    ref: string;
  };
  type: string;
} & {
  [type: string]: string | number | boolean;
};
export type AnswersResponse = {
  response_id: string;
  response_type: string;
  landed_at: string;
  submitted_at: string;
  answers: Answer[];
};

export type ErrorResponse = {
  code: string;
  description: string;
  help?: string;
};
