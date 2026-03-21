import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { GiteaPullRequest, GiteaFile } from "../types";

interface Preferences {
  giteaUrl: string;
  giteaToken: string;
  repository: string;
}

export class GiteaAPI {
  private baseUrl: string;
  private token: string;
  private repo: string;

  constructor() {
    const prefs = getPreferenceValues<Preferences>();
    this.baseUrl = prefs.giteaUrl;
    this.token = prefs.giteaToken;
    this.repo = prefs.repository;
  }

  private get headers() {
    return {
      Authorization: `token ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async getPullRequests(state: "open" | "closed" | "all" = "open"): Promise<GiteaPullRequest[]> {
    const url = `${this.baseUrl}/api/v1/repos/${this.repo}/pulls?state=${state}`;

    try {
      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        throw new Error(`Gitea API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data as GiteaPullRequest[];
    } catch (error) {
      console.error("Error fetching pull requests:", error);
      throw error;
    }
  }

  async getPullRequest(prNumber: number): Promise<GiteaPullRequest> {
    const url = `${this.baseUrl}/api/v1/repos/${this.repo}/pulls/${prNumber}`;

    try {
      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Gitea API error: ${response.statusText} (${response.status}) - ${errorText.slice(0, 200)}`
        );
      }

      const data = await response.json();
      return data as GiteaPullRequest;
    } catch (error) {
      console.error("Error fetching pull request:", error);
      throw error;
    }
  }

  async getPullRequestFiles(prNumber: number): Promise<GiteaFile[]> {
    const url = `${this.baseUrl}/api/v1/repos/${this.repo}/pulls/${prNumber}/files`;

    try {
      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        throw new Error(`Gitea API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data as GiteaFile[];
    } catch (error) {
      console.error("Error fetching pull request files:", error);
      throw error;
    }
  }

  async getPullRequestDiff(prNumber: number): Promise<string> {
    // Gitea provides diff directly via .diff endpoint
    const url = `${this.baseUrl}/api/v1/repos/${this.repo}/pulls/${prNumber}.diff`;

    try {
      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        throw new Error(`Gitea API error: ${response.statusText} (URL: ${url})`);
      }

      return await response.text();
    } catch (error) {
      console.error("Error fetching pull request diff:", error);
      throw error;
    }
  }

  async createReviewComment(
    prNumber: number,
    body: string,
    commitId?: string,
    path?: string,
    position?: number
  ): Promise<void> {
    const url = `${this.baseUrl}/api/v1/repos/${this.repo}/pulls/${prNumber}/reviews`;

    const reviewData = {
      body,
      event: "COMMENT",
      comments:
        path && position
          ? [
              {
                path,
                body,
                position,
              },
            ]
          : undefined,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gitea API error: ${response.statusText} - ${errorText.slice(0, 200)}`);
      }
    } catch (error) {
      console.error("Error creating review comment:", error);
      throw error;
    }
  }

  async createPullRequestComment(prNumber: number, body: string): Promise<void> {
    const url = `${this.baseUrl}/api/v1/repos/${this.repo}/issues/${prNumber}/comments`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ body }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gitea API error: ${response.statusText} - ${errorText.slice(0, 200)}`);
      }
    } catch (error) {
      console.error("Error creating pull request comment:", error);
      throw error;
    }
  }
}
