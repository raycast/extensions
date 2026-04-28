import { BaseService } from "./BaseService";
import { Flavor } from "./types";
import { CLIError } from "../core/errors";

/**
 * Service for listing OpenStack Nova flavors (hardware profiles).
 */
export class FlavorService extends BaseService {
  /**
   * Lists all flavors accessible in the active project,
   * sorted by vCPU count ascending.
   * Results are cached for 5 minutes.
   */
  async listFlavors(): Promise<Flavor[]> {
    try {
      const flavors = await this.fetchData<Flavor[]>(["flavor", "list"]);
      return flavors.sort((a, b) => (a.vcpus ?? 0) - (b.vcpus ?? 0));
    } catch (error) {
      if (error instanceof CLIError) {
        this.handleCLIError(error, "Failed to list flavors");
      }
      return [];
    }
  }

  /**
   * Fetches detailed information for a single flavor.
   */
  async getFlavor(id: string): Promise<Flavor> {
    return this.cli.run<Flavor>(["flavor", "show", id]);
  }
}
