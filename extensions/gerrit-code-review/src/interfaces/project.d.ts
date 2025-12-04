export interface GerritProjects {
  [key: string]: Project;
}

export interface ProjectWebLinks {
  name: string;
  url: string;
  target: string;
}

export interface Project {
  id: string;
  state: string;
  description?: string;
  web_links: ProjectWebLinks[];

  url: string; // Custom value populated by extension
}

export interface ProjectBranch {
  ref: string;
  revision: string;
  web_links?: ProjectWebLinks[];

  name: string; // Custom value populated by extension
}
