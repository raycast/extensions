export type Project = {
  id: string;
  name: string;
  description: string;
  url: string;
  state: string;
};

export interface ProjectResponse {
  count: number;
  value: Project[];
}
