import { BaseService } from "./BaseService";
import { Network } from "./types";
import { CLIError } from "../core/errors";

/**
 * Service for listing OpenStack Neutron networks.
 */
export class NetworkService extends BaseService {
  /**
   * Lists all networks visible to the active project.
   * Results are cached for 5 minutes.
   */
  async listNetworks(): Promise<Network[]> {
    try {
      return await this.fetchData<Network[]>(["network", "list"]);
    } catch (error) {
      if (error instanceof CLIError) {
        this.handleCLIError(error, "Failed to list networks");
      }
      return [];
    }
  }

  /**
   * Fetches detailed information for a single network.
   */
  async getNetwork(id: string): Promise<Network> {
    return this.cli.run<Network>(["network", "show", id]);
  }
}
