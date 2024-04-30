import * as azdev from "azure-devops-node-api";
import * as coreApi from "azure-devops-node-api/CoreApi";
import * as WorkItemTrackingApi from "azure-devops-node-api/WorkItemTrackingApi";
import { Project, WorkItem, WorkItemExtended, WorkItemType } from "../utils/types";

class AzureDevOpsApiClient {
  private readonly _connection: azdev.WebApi;

  constructor(orgUrl: string, token: string) {
    this._connection = new azdev.WebApi(orgUrl, azdev.getPersonalAccessTokenHandler(token));
  }

  private async getWorkItemTrackingApi(): Promise<WorkItemTrackingApi.IWorkItemTrackingApi> {
    return await this._connection.getWorkItemTrackingApi();
  }

  private async getCoreApi(): Promise<coreApi.ICoreApi> {
    return await this._connection.getCoreApi();
  }

  async getWorkItems(projejct?: string): Promise<WorkItem[]> {
    const items = (await (await this.getWorkItemTrackingApi()).getRecentActivityData()) as WorkItem[];

    return projejct ? items.filter((item) => item.teamProject === projejct) : items;
  }

  async getMyWorkItems(project?: string): Promise<WorkItem[]> {
    const items = (await (await this.getWorkItemTrackingApi()).getAccountMyWorkData()).workItemDetails as WorkItem[];

    return project ? items.filter((item) => item.teamProject === project) : items;
  }

  async getWorkItem(id: number): Promise<WorkItemExtended> {
    return (await (await this.getWorkItemTrackingApi()).getWorkItem(id)) as WorkItemExtended;
  }

  async getWorkItemUrl(id: number): Promise<string> {
    const item: WorkItemExtended = await this.getWorkItem(id);

    return item._links?.html.href as string;
  }

  async getWorkItemTypes(projectId: string): Promise<WorkItemType[]> {
    return (await (await this.getWorkItemTrackingApi()).getWorkItemTypes(projectId)) as WorkItemType[];
  }

  async getProjects(): Promise<Project[]> {
    return (await (await this.getCoreApi()).getProjects()) as Project[];
  }
}

export default AzureDevOpsApiClient;
