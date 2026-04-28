import { showToast, Toast } from "@raycast/api";
import { BaseService } from "./BaseService";
import { MagnumCluster } from "./types";
import { CLIError } from "../core/errors";

/**
 * Patterns in stderr that indicate the Magnum service is not available
 * in the current region/deployment.
 */
const MAGNUM_UNAVAILABLE_PATTERNS = ["endpoint not found", "No endpoint for service", "service not available"];

/**
 * Returns true if the stderr message indicates the Magnum service
 * is not available rather than a general failure.
 */
function isMagnumUnavailable(stderr: string): boolean {
  const lower = stderr.toLowerCase();
  return MAGNUM_UNAVAILABLE_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
}

/**
 * Service for listing OpenStack Magnum Kubernetes clusters.
 *
 * Overrides error handling to detect when the Magnum service is
 * unavailable and show an informational Toast instead of a failure.
 */
export class ClusterService extends BaseService {
  /**
   * Lists all Magnum clusters in the active project.
   * Results are cached for 5 minutes.
   *
   * If the Magnum service is not available, shows an informational
   * Toast and returns an empty array instead of throwing.
   */
  async listClusters(): Promise<MagnumCluster[]> {
    try {
      return await this.fetchData<MagnumCluster[]>(["coe", "cluster", "list"]);
    } catch (error) {
      if (error instanceof CLIError) {
        if (isMagnumUnavailable(error.stderr)) {
          await showToast({
            style: Toast.Style.Success,
            title: "Magnum not available",
            message: "The Kubernetes (Magnum) service is not available in this region.",
          });
          return [];
        }
        this.handleCLIError(error, "Failed to list clusters");
      }
      return [];
    }
  }

  /**
   * Fetches detailed information for a single cluster.
   */
  async getCluster(id: string): Promise<MagnumCluster> {
    return this.cli.run<MagnumCluster>(["coe", "cluster", "show", id]);
  }
}
