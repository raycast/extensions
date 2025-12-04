export type File = {
  key: string;
  last_modified: string;
  name: string;
  thumbnail_url: string;
  branches: Branch[];
};

export type Branch = {
  key: string;
  last_modified: string;
  name: string;
  thumbnail_url: string;
};

export type Project = {
  id: string;
  name: string;
};

export type ProjectFiles = {
  files?: File[];
  name: string;
};

export type TeamFiles = {
  name: string;
  files: ProjectFiles[];
};

export type TeamProjects = {
  name: string;
  projects: Project[];
};

export type FileDetail = {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  document: Node;
};

export interface Node {
  id: string;
  name: string;
  children: Node[];
}
