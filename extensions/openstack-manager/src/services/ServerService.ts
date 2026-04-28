import { BaseService } from "./BaseService";
import { Server } from "./types";
import { CLIError } from "../core/errors";

/**
 * Service for managing OpenStack Nova compute instances.
 */
export class ServerService extends BaseService {
  /**
   * Lists all servers in the active project.
   */
  async listServers(): Promise<Server[]> {
    try {
      return await this.fetchData<Server[]>(["server", "list"]);
    } catch (error) {
      if (error instanceof CLIError) {
        this.handleCLIError(error, "Failed to list servers");
      }
      return [];
    }
  }

  /**
   * Fetches detailed information for a single server.
   */
  async getServer(id: string): Promise<Server> {
    return this.cli.run<Server>(["server", "show", id]);
  }

  async startServer(id: string): Promise<void> {
    await this.cli.exec(["server", "start", id]);
  }

  async stopServer(id: string): Promise<void> {
    await this.cli.exec(["server", "stop", id]);
  }

  async rebootServer(id: string): Promise<void> {
    await this.cli.exec(["server", "reboot", "--soft", id]);
  }
}
