import { Project } from "./SketchWorkspaceShare";

export interface CreateProjectBodyRes {
  data: Data;
}
interface Data {
  createWorkspaceProject: CreateWorkspaceProject;
}
interface CreateWorkspaceProject {
  __typename: string;
  project: Project;
}
