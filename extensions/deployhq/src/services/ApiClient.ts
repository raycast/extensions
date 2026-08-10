import { Logger } from "../utils/LoggerSingleton";
import { Project } from "../lib/interfaces";

interface ApiResponse {
  data: Project[];
  headers: Record<string, string>;
}

/**
 * API class to handle all API calls to DeployHQ
 * https://www.deployhq.com/support/api
 */
export default class ApiClient {
  private readonly baseURL: string;
  private readonly headerAuth: string;

  constructor(baseURL: string, apiKey: string, username: string) {
    this.baseURL = baseURL;
    this.headerAuth = `Basic ${btoa(`${username}:${apiKey}`)}`;
  }

  public async call(url: string): Promise<ApiResponse> {
    try {
      const response = await fetch(this.baseURL + url, {
        headers: {
          Authorization: this.headerAuth,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`DeployHQ API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as Project[];

      // Optimize header extraction
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return { data, headers };
    } catch (error) {
      Logger.error("Error fetching projects:", error);
      throw error;
    }
  }
}
