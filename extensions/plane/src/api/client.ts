import {
  Configuration,
  CyclesApi,
  LabelsApi,
  ModulesApi,
  ProjectsApi,
  StatesApi,
  UsersApi,
  WorkItemsApi,
  MembersApi,
  WorkItemTypesApi,
} from "@makeplane/plane-node-sdk";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

export class PlaneClient {
  accessToken: string;
  config: Configuration;
  workspaceSlug: string;
  workItemsApi: WorkItemsApi;
  workItemTypesApi: WorkItemTypesApi;
  projectsApi: ProjectsApi;
  labelsApi: LabelsApi;
  statesApi: StatesApi;
  usersApi: UsersApi;
  membersApi: MembersApi;
  modulesApi: ModulesApi;
  cyclesApi: CyclesApi;

  constructor(accessToken: string, workspaceSlug: string) {
    this.accessToken = accessToken;
    this.config = new Configuration({
      accessToken,
      basePath: preferences.API_BASE_PATH,
    });

    this.workspaceSlug = workspaceSlug;
    this.workItemsApi = new WorkItemsApi(this.config);
    this.workItemTypesApi = new WorkItemTypesApi(this.config);
    this.projectsApi = new ProjectsApi(this.config);
    this.labelsApi = new LabelsApi(this.config);
    this.statesApi = new StatesApi(this.config);
    this.usersApi = new UsersApi(this.config);
    this.membersApi = new MembersApi(this.config);
    this.modulesApi = new ModulesApi(this.config);
    this.cyclesApi = new CyclesApi(this.config);
  }
}
