import axios, { AxiosInstance } from 'axios';
import { RawTask } from '../types/priority.types';

export class GitHubService {
  private client: AxiosInstance;
  private token: string;

  constructor(token: string) {
    this.token = token;
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Developer-Decision-Navigator',
      },
    });
  }

  async getAssignedIssues(): Promise<RawTask[]> {
    try {
      // Get issues assigned to the user
      const response = await this.client.get('/issues', {
        params: {
          filter: 'assigned',
          state: 'open',
          per_page: 100,
        },
      });

      return response.data.map((issue: any) => ({
        id: `github-issue-${issue.id}`,
        title: issue.title,
        description: issue.body || '',
        source: 'github',
        type: 'issue',
        url: issue.html_url,
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        priority: this.calculatePriority(issue),
        metadata: {
          repository: issue.repository?.full_name || '',
          labels: issue.labels?.map((l: any) => l.name) || [],
          assignees: issue.assignees?.map((a: any) => a.login) || [],
        },
      }));
    } catch (error) {
      console.error('Failed to fetch GitHub issues:', error);
      return [];
    }
  }

  async getPullRequests(): Promise<RawTask[]> {
    try {
      // Get PRs assigned to the user (PRs appear in /issues with pull_request property)
      const response = await this.client.get('/issues', {
        params: {
          filter: 'assigned',
          state: 'open',
          per_page: 100,
        },
      });

      const prs = response.data.filter((issue: any) => issue.pull_request);

      return prs.map((pr: any) => ({
        id: `github-pr-${pr.id}`,
        title: pr.title,
        description: pr.body || '',
        source: 'github',
        type: 'pull_request',
        url: pr.html_url,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        priority: this.calculatePriority(pr),
        metadata: {
          repository: pr.base?.repo?.full_name || '',
          branch: pr.head?.ref || '',
          isDraft: pr.draft || false,
          reviewRequested: pr.requested_reviewers?.length > 0 || false,
        },
      }));
    } catch (error) {
      console.error('Failed to fetch GitHub PRs:', error);
      return [];
    }
  }

  private calculatePriority(item: any): number {
    let priority = 5; // Default medium priority

    // Higher priority for issues with labels like "urgent", "bug", "critical"
    const urgentLabels = ['urgent', 'bug', 'critical', 'p0', 'p1'];
    const hasUrgentLabel = item.labels?.some((label: any) =>
      urgentLabels.some((urgent) => label.name.toLowerCase().includes(urgent))
    );

    if (hasUrgentLabel) priority -= 2;

    // Lower priority for items with "enhancement" or "feature" labels
    const lowPriorityLabels = ['enhancement', 'feature', 'p3', 'p4'];
    const hasLowPriorityLabel = item.labels?.some((label: any) =>
      lowPriorityLabels.some((low) => label.name.toLowerCase().includes(low))
    );

    if (hasLowPriorityLabel) priority += 1;

    // Adjust based on age (older items get slightly higher priority)
    const ageInDays = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > 7) priority -= 1;

    return Math.max(1, Math.min(10, priority));
  }
}
