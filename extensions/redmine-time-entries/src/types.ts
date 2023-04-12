import { Form } from "@raycast/api";

export type AuthValues = {
  key: string;
  redURL: string;
};

export type Preferences = {
  redmineUrl: string;
  redmineApiKey: string;
};

export type Project = {
  id: number;
  name: string;
  identifier: string;
  description: string;
  status: number;
  created_on: string;
  updated_on: string;
};

export type Values = {
  project_id: string;
  spent_on: Date;
  hours: string;
  comments: string;
  activity_id: string;
};

export type ActivitySelectProps = {
  id: string;
  title?: string;
  placeholder?: string;
  error?: string;
  onBlur: (event: Form.Event<string[] | string>) => void;
  onChange?: (value: string | Date | null | undefined) => void;
};
