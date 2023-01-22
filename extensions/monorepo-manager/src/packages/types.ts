export interface WorkspaceExport {
  path: string;
  file: string;
}

export interface Team {
  name: string;
  members: string[];
  slack: string;
  notificationsSlack?: string;
  project: string;
  directlyResponsibleIndividual: string;
  manager?: string;
  skipManager?: string;
  teamId?: string;
}
