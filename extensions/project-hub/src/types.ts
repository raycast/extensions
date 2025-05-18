export interface Project {
  id: string;
  title: string;
  subtitle?: string;
  color?: string;
}

export interface ProjectLink {
  id: string;
  projectId: string;
  title: string;
  url: string;
}
