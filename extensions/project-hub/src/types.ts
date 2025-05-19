export type Color = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "gray";

export interface Project {
  id: string;
  title: string;
  subtitle?: string;
  color?: Color;
}

export interface ProjectLink {
  id: string;
  projectId: string;
  title: string;
  url: string;
}
