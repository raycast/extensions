import { BaseService } from "./BaseService";
import { Image } from "./types";
import { CLIError } from "../core/errors";

/**
 * Service for listing OpenStack Glance images.
 */
export class ImageService extends BaseService {
  /**
   * Lists all images visible to the active project.
   * Results are cached for 5 minutes.
   */
  async listImages(): Promise<Image[]> {
    try {
      return await this.fetchData<Image[]>(["image", "list"]);
    } catch (error) {
      if (error instanceof CLIError) {
        this.handleCLIError(error, "Failed to list images");
      }
      return [];
    }
  }

  /**
   * Fetches detailed information for a single image.
   */
  async getImage(id: string): Promise<Image> {
    return this.cli.run<Image>(["image", "show", id]);
  }
}
