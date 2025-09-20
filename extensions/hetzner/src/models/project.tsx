export interface Project {
  name: string;
  projectId: string;
  accessToken: string;
  permission: "read" | "readWrite";
  selected: boolean;
}
