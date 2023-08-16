import { Me, Workspace, Project, Client, Tag, TimeEntry } from "../toggl/types";

export type Refreshable<T> = {
  lastRefresh: string | null;
  get: () => Promise<T>;
  refresh: () => Promise<T>;
};

export type TogglStorage = {
  me: Refreshable<Me | null>;
  workspaces: Refreshable<Workspace[]>;
  projects: Refreshable<Project[]>;
  clients: Refreshable<Client[]>;
  tags: Refreshable<Tag[]>;
  timeEntries: Refreshable<TimeEntry[]>;
  runningTimeEntry: Refreshable<TimeEntry | null>;
};

export type Storable<T> = {
  lastRefresh: Date;
  data: T;
};
