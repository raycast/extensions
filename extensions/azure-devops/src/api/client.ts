import * as azdev from "azure-devops-node-api";
import { Project, WorkItem, WorkItemExtended, WorkItemType } from "../utils/types";
import { ICoreApi } from "azure-devops-node-api/CoreApi";
import { IWorkItemTrackingApi } from "azure-devops-node-api/WorkItemTrackingApi";
import { IGitApi } from "azure-devops-node-api/GitApi";
import { GitRepository } from "azure-devops-node-api/interfaces/TfvcInterfaces";
import { TeamProject } from "azure-devops-node-api/interfaces/CoreInterfaces";
import { GitPullRequest, PullRequestStatus } from "azure-devops-node-api/interfaces/GitInterfaces";

class AzureDevOpsApiClient {
  private readonly _connection: azdev.WebApi;

  constructor(orgUrl: string, token: string) {
    this._connection = new azdev.WebApi(orgUrl, azdev.getPersonalAccessTokenHandler(token));
  }

  private async getWorkItemTrackingApi(): Promise<IWorkItemTrackingApi> {
    return await this._connection.getWorkItemTrackingApi();
  }

  private async getCoreApi(): Promise<ICoreApi> {
    return await this._connection.getCoreApi();
  }

  private async getGitApi(): Promise<IGitApi> {
    return await this._connection.getGitApi();
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

  async getTeamProjects(): Promise<TeamProject[]> {
    return await (await this.getCoreApi()).getProjects();
  }

  async getProjectRepositories(projectId?: string): Promise<GitRepository[]> {
    return await (await this.getGitApi()).getRepositories(projectId, false, false, false);
  }

  async getProjectPullRequests(
    projectId?: string,
    repositoryId?: string,
    creatorId?: string,
  ): Promise<GitPullRequest[]> {
    return await (
      await this.getGitApi()
    ).getPullRequestsByProject(projectId!, {
      status: PullRequestStatus.Active,
      repositoryId: repositoryId,
      creatorId: creatorId,
    });
  }

  async getPullRequestById(repositoryId: string, pullRequestId: number): Promise<GitPullRequest> {
    return await (await this.getGitApi()).getPullRequest(repositoryId, pullRequestId);
  }
}

export default AzureDevOpsApiClient;
