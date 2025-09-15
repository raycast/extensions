import { withAccessToken } from "./auth";

const TEMBO_API_BASE = "https://api.tembo.io";
const TEMBO_UI_BASE = "https://app.tembo.io";

export type SolutionStatus = "Pending" | "Success" | "Failed";
export type SolutionType = "PullRequest";
export type PullRequestStatus = "open" | "merged" | "closed";

export interface IssueTag {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface PullRequest {
  id: string;
  url: string;
  title?: string;
  externalId: string;
  externalProvider: string;
  status: PullRequestStatus;
  mergedAt?: string;
  mergedBy?: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Solution {
  id: string;
  status: SolutionStatus;
  type: SolutionType;
  jobId?: string;
  createdAt: string;
  updatedAt: string;
  pullRequest: PullRequest[];
}

export interface Integration {
  id: string;
  type: string;
  externalId?: string;
  enabledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueSource {
  id: string;
  name: string;
  type: string;
  externalId?: string;
  externalUrl?: string;
  enabledAt?: string;
  lastSeenAt?: string;
  lastScannedAt?: string;
  integration?: Integration;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: string;
  title: string;
  hash: string;
  summary?: string;
  externalId?: string;
  externalUrl?: string;
  kind: string;
  targetBranch?: string;
  level: number;
  levelReasoning?: string;
  lastSeenAt: string;
  lastQueuedAt?: string;
  lastQueuedBy?: string;
  createdBy?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
  issueSource: IssueSource;
  solutions: Solution[];
  tags: IssueTag[];
}

export interface IssueListResponse {
  issues: Issue[];
  meta: {
    totalCount: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CreateIssueRequest {
  title?: string;
  description: string;
  json: string;
  queueRightAway: boolean;
  codeRepoIds?: string[];
  branch?: string;
}

export interface CodeRepository {
  id: string;
  name: string;
  url: string;
  description?: string;
  owner?: string;
  externalId: string;
  targetBranch?: string;
  enabledAt?: string;
  integrationId: string;
  integration: {
    id: string;
    type: string;
    externalId?: string;
    enabledAt?: string;
  };
}

export interface CodeRepositoryListResponse {
  codeRepositories: CodeRepository[];
}

class TemboAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return withAccessToken(async (token) => {
      const url = `${TEMBO_API_BASE}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request to ${endpoint} failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      return response.json() as Promise<T>;
    });
  }

  async getIssues(params?: {
    pageSize?: number;
    sources?: string[];
    severity?: string[];
    integrationType?: string[];
    showHiddenIssues?: boolean;
  }): Promise<Issue[]> {
    const searchParams = new URLSearchParams();

    if (params?.pageSize) searchParams.append("limit", params.pageSize.toString());
    searchParams.append("page", "1");

    const queryString = searchParams.toString();
    const endpoint = `/public-api/task/list${queryString ? `?${queryString}` : ""}`;

    const response = await this.request<IssueListResponse>(endpoint);
    return response.issues || [];
  }

  async createIssue(data: CreateIssueRequest): Promise<Issue> {
    return this.request<Issue>("/public-api/task/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCodeRepositories(): Promise<CodeRepository[]> {
    const response = await this.request<CodeRepositoryListResponse>("/public-api/repository/list");
    return response.codeRepositories;
  }
}

export const temboAPI = new TemboAPI();
export { TEMBO_UI_BASE };
