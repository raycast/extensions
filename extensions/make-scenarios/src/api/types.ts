/** Zone is the full domain, e.g. "eu1.make.com" */
export type Zone = string;

export interface Organization {
  id: number;
  name: string;
  zone: Zone;
}

export interface Team {
  id: number;
  name: string;
  organizationId: number;
}

export interface ScenarioUser {
  id: number;
  name: string;
  email: string;
}

export interface Scenario {
  id: number;
  name: string;
  description: string;
  /** Lowercase 'l' matches the Make.com API response field name */
  islinked: boolean;
  isPaused: boolean;
  teamId: number;
  hookId: number | null;
  folderId: number | null;
  lastEdit: string;
  updatedByUser: ScenarioUser | null;
}

export interface Hook {
  id: number;
  url: string;
}

export interface Folder {
  id: number;
  name: string;
}

export interface ScenarioItem {
  scenario: Scenario;
  team: Team;
  org: Organization;
  folder: Folder | null;
  webhookUrl: string | null;
}
