import { LocalStorage } from "@raycast/api";
import { BaseService } from "./BaseService";
import { SecurityGroup } from "./types";
import { CLIError } from "../core/errors";

/**
 * Service for listing OpenStack Neutron security groups.
 * Filters to only show security groups belonging to the current project.
 */
export class SecurityGroupService extends BaseService {
  /**
   * Lists security groups scoped to the current project.
   */
  async listSecurityGroups(): Promise<SecurityGroup[]> {
    try {
      const projectId = await this.getCurrentProjectId();

      if (projectId) {
        return await this.fetchData<SecurityGroup[]>(["security", "group", "list", "--project", projectId]);
      }

      return await this.fetchData<SecurityGroup[]>(["security", "group", "list"]);
    } catch (error) {
      if (error instanceof CLIError) {
        this.handleCLIError(error, "Failed to list security groups");
      }
      return [];
    }
  }

  /**
   * Fetches detailed information for a single security group.
   */
  async getSecurityGroup(id: string): Promise<SecurityGroup> {
    return this.cli.run<SecurityGroup>(["security", "group", "show", id]);
  }

  /**
   * Gets the current project ID by running `openstack token issue`.
   * Cached in LocalStorage since the project doesn't change within a config.
   */
  private async getCurrentProjectId(): Promise<string | null> {
    const cacheKey = "current-project-id";
    try {
      const cached = await LocalStorage.getItem<string>(cacheKey);
      if (cached) return cached;
    } catch {
      // ignore
    }

    try {
      const token = await this.cli.run<{ project_id?: string }>(["token", "issue"]);
      const projectId = token.project_id;
      if (projectId) {
        await LocalStorage.setItem(cacheKey, projectId);
        return projectId;
      }
      return null;
    } catch {
      return null;
    }
  }
}
