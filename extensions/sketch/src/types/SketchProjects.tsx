export interface GetProjectsBodyRes {
  data: Data;
}
export interface Data {
  workspace: Workspace;
}
export interface Workspace {
  __typename: string;
  identifier: string;
  projects: Projects;
}
export interface Projects {
  __typename: string;
  entries?: EntriesEntity[] | null;
  meta: Meta;
}
export interface EntriesEntity {
  __typename: string;
  identifier: string;
  name: string;
  shortId: string;
  type: string;
}
export interface Meta {
  __typename: string;
  after?: null;
  before?: null;
  limit: number;
  totalCount: number;
}
