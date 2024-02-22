export type Tag = {
  [key: string]: string | number | boolean;
};
export type Log = {
  project: string;
  channel: string;
  event: string;
  timestamp?: number;
  description?: string;
  icon?: string;
  notify?: boolean;
  tags?: Tag;
  parser?: "markdown" | "text";
};
export type Insight = {
  project: string;
  title: string;
  value: string;
  icon?: string;
};

type BodyErrorObject = {
  path: string;
  type: string;
  message: string;
};
export type ErrorResponse = {
  message: string;
  validation: {
    body?: BodyErrorObject[];
  };
};
