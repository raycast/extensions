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
  culprit: string;
  firstSeen: string;
  lastSeen: string;
  level: string;
  permalink: string;
  title: string;
  status: string;
  shortId: string;
  userCount: number;
  type: string;
  project: Project;
}
