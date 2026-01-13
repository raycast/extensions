export interface GcpProject {
  projectId: string;
  name: string;
  projectNumber?: string;
}

export interface GcpResource {
  id: string;
  name: string;
  path: string;
  keywords: string[];
}

export interface ProjectCache {
  projects: GcpProject[];
  lastUpdated: number;
}
