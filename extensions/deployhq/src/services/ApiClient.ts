import { Logger } from "../utils/LoggerSingleton";
import { Project } from "../lib/interfaces";

/**
 * API class to handle all API calls to DeployHQ
 * https://www.deployhq.com/support/api
 */
export default class ApiClient {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly username: string;
  private readonly accountName: string;
  private readonly headerAuth: string;

  constructor(baseURL: string, apiKey: string, username: string, accountName: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.username = username;
    this.accountName = accountName;
    this.headerAuth = `Basic ${btoa(`${this.username}:${this.apiKey}`)}`;
  }

  public async call(url: string): Promise<{ data: Array<Project>; headers: Record<string, string> }> {
    try {
      const response = await fetch(this.baseURL + url, {
        headers: {
          Authorization: this.headerAuth,
        },
      });

      if (response.status !== 200) {
        const errorText = await response.text();
        Logger.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`DeployHQ API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as Array<Project>;

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        data,
        headers,
      };
    } catch (error) {
      Logger.error("Error fetching projects:", error);
      throw error;
    }
  }
}
