import axios, { AxiosInstance } from "axios";
import {
  HubSpotWorkflow,
  HubSpotWorkflowsResponse,
  HubSpotApiConfig,
  HubSpotMarketingEmail,
  HubSpotMarketingEmailsResponse,
} from "../types/hubspot";

export class HubSpotApiClient {
  public client: AxiosInstance;
  private config: HubSpotApiConfig;

  constructor(config: HubSpotApiConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: "https://api.hubapi.com",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get all workflows with pagination support
   * Loops through all pages to return complete results
   */
  async getAllWorkflows(): Promise<HubSpotWorkflow[]> {
    const allWorkflows: HubSpotWorkflow[] = [];
    let after: string | undefined;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      try {
        pageCount++;
        console.log(`Fetching page ${pageCount}...`);

        const response = await this.client.get<HubSpotWorkflowsResponse>(
          "/automation/v4/flows",
          {
            params: {
              limit: 100,
              ...(after && { after }),
            },
          },
        );

        const { results, paging } = response.data;

        // Add null checks for the response structure
        if (results && Array.isArray(results)) {
          allWorkflows.push(...results);
          console.log(
            `Loaded ${results.length} workflows (total: ${allWorkflows.length})`,
          );
        }

        // Check if there are more pages - add null checks
        if (paging && paging.next && paging.next.after) {
          after = paging.next.after;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error("Error fetching workflows:", error);
        throw new Error(
          `Failed to fetch workflows: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    console.log(
      `Completed loading ${allWorkflows.length} workflows across ${pageCount} pages`,
    );
    return allWorkflows;
  }

  /**
   * Search workflows by name
   */
  async searchWorkflows(query: string): Promise<HubSpotWorkflow[]> {
    const allWorkflows = await this.getAllWorkflows();

    if (!query.trim()) {
      return allWorkflows;
    }

    const searchTerm = query.toLowerCase();
    return allWorkflows.filter(
      (workflow) =>
        workflow.name.toLowerCase().includes(searchTerm) ||
        workflow.uuid.toLowerCase().includes(searchTerm),
    );
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(id: string): Promise<HubSpotWorkflow | null> {
    try {
      const response = await this.client.get<HubSpotWorkflow>(
        `/automation/v4/flows/${id}`,
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching workflow ${id}:`, error);
      return null;
    }
  }

  /**
   * Generate HubSpot workflow URL
   */
  getWorkflowUrl(workflowId: string): string {
    return `https://app.hubspot.com/workflows/${this.config.portalId}/platform/flow/${workflowId}/edit`;
  }

  /**
   * Get all marketing emails with pagination support
   * Loops through all pages to return complete results
   */
  async getAllMarketingEmails(): Promise<HubSpotMarketingEmail[]> {
    const allEmails: HubSpotMarketingEmail[] = [];
    let after: string | undefined;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      try {
        pageCount++;
        console.log(`Fetching marketing emails page ${pageCount}...`);

        const response = await this.client.get<HubSpotMarketingEmailsResponse>(
          "/marketing/v3/emails",
          {
            params: {
              limit: 100,
              includeStats: true,
              ...(after && { after }),
            },
          },
        );

        const { results, paging } = response.data;

        // Add null checks for the response structure
        if (results && Array.isArray(results)) {
          allEmails.push(...results);
          console.log(
            `Loaded ${results.length} marketing emails (total: ${allEmails.length})`,
          );
        }

        // Check if there are more pages - add null checks
        if (paging && paging.next && paging.next.after) {
          after = paging.next.after;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error("Error fetching marketing emails:", error);
        throw new Error(
          `Failed to fetch marketing emails: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    console.log(
      `Completed loading ${allEmails.length} marketing emails across ${pageCount} pages`,
    );
    return allEmails;
  }

  /**
   * Search marketing emails by name or subject
   */
  async searchMarketingEmails(query: string): Promise<HubSpotMarketingEmail[]> {
    const allEmails = await this.getAllMarketingEmails();

    if (!query.trim()) {
      return allEmails;
    }

    const searchTerm = query.toLowerCase();
    return allEmails.filter(
      (email) =>
        (email.name || "").toLowerCase().includes(searchTerm) ||
        (email.subject || "").toLowerCase().includes(searchTerm),
    );
  }

  /**
   * Generate HubSpot marketing email URL
   */
  getMarketingEmailUrl(emailId: string): string {
    return `https://app.hubspot.com/email/${this.config.portalId}/details/${emailId}/performance`;
  }
}
