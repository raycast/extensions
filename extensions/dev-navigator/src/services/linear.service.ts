import axios, { AxiosInstance } from 'axios';
import { RawTask } from '../types/priority.types';

export class LinearService {
  private client: AxiosInstance;
  private token: string;

  constructor(token: string) {
    this.token = token;
    this.client = axios.create({
      baseURL: 'https://api.linear.app/graphql',
      headers: {
        Authorization: this.token,
        'Content-Type': 'application/json',
      },
    });
  }

  async getAssignedIssues(): Promise<RawTask[]> {
    const query = `
      query {
        issues(filter: { assignee: { isMe: { eq: true } }, state: { type: { nin: ["completed", "canceled"] } } }) {
          nodes {
            id
            title
            description
            url
            createdAt
            updatedAt
            priority
            estimate
            state {
              name
              type
            }
            project {
              name
            }
            team {
              name
            }
            labels {
              nodes {
                name
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.client.post('', { query });

      return response.data.data.issues.nodes.map((issue: any) => ({
        id: `linear-${issue.id}`,
        title: issue.title,
        description: issue.description || '',
        source: 'linear',
        type: 'issue',
        url: issue.url,
        createdAt: new Date(issue.createdAt),
        updatedAt: new Date(issue.updatedAt),
        priority: this.calculatePriority(issue),
        metadata: {
          linearPriority: issue.priority,
          estimate: issue.estimate,
          state: issue.state.name,
          stateType: issue.state.type,
          project: issue.project?.name || '',
          team: issue.team?.name || '',
          labels: issue.labels?.nodes?.map((l: any) => l.name) || [],
        },
      }));
    } catch (error) {
      console.error('Failed to fetch Linear issues:', error);
      return [];
    }
  }

  private calculatePriority(issue: any): number {
    // Linear priority is 0 (No priority) to 4 (Urgent)
    // Convert to our 1-10 scale
    const linearPriority = issue.priority || 0;

    // Map Linear priorities to our scale
    const priorityMap: { [key: number]: number } = {
      0: 5, // No priority -> Medium
      1: 7, // Low -> Medium-High
      2: 8, // Medium -> High
      3: 9, // High -> Very High
      4: 10, // Urgent -> Critical
    };

    let priority = priorityMap[linearPriority] || 5;

    // Adjust based on state type
    if (issue.state?.type === 'started') {
      priority += 1; // Boost priority for in-progress items
    }

    // Adjust based on estimate (higher estimates get lower priority if not urgent)
    if (issue.estimate && issue.estimate > 5 && linearPriority < 3) {
      priority -= 1;
    }

    return Math.max(1, Math.min(10, priority));
  }
}
