export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  name: string;
  organization: Organization;
  slug: string;
  color: string;
  dateCreated: string;
}

export interface Issue {
  id: string;
  count: number;
  lastSeen: string;
  level: string;
  permalink: string;
  title: string;
  shortId: string;
  userCount: number;
  project: Project;
  assignedTo?: User | Team;
}

export interface User {
  email: string;
  type: "user";
  id: string;
  name: string;
}

export interface Team {
  type: "team";
  name: string;
}
