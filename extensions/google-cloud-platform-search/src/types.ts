export interface Project {
  name: string;
  projectId: string;
  displayName?: string | null;
}

export interface ConsoleProduct {
  name: string;
  toUrl: (project: string) => string;
}

export interface DocumentationProduct {
  id: string;
  title: string;
  documentationLink: string;
  preferred: boolean;
}

export interface DiscoveryAPI {
  items: DocumentationProduct[];
}
