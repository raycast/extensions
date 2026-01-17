import { RawTask } from '../types/priority.types';
import { GitHubService } from '../services/github.service';
import { LinearService } from '../services/linear.service';
import { SlackService } from '../services/slack.service';
import { UserPreferences } from '../types/preferences';

export class TaskAggregator {
  private githubService?: GitHubService;
  private linearService?: LinearService;
  private slackService?: SlackService;

  constructor(preferences: UserPreferences) {
    if (preferences.githubToken) {
      this.githubService = new GitHubService(preferences.githubToken);
    }
    if (preferences.linearToken) {
      this.linearService = new LinearService(preferences.linearToken);
    }
    if (preferences.slackToken) {
      this.slackService = new SlackService(preferences.slackToken);
    }
  }

  async collectAllTasks(): Promise<RawTask[]> {
    const allTasks: RawTask[] = [];
    const promises: Promise<RawTask[]>[] = [];

    if (this.githubService) {
      promises.push(this.collectGitHubTasks());
    }

    if (this.linearService) {
      promises.push(this.collectLinearTasks());
    }

    if (this.slackService) {
      promises.push(this.collectSlackTasks());
    }

    try {
      const results = await Promise.allSettled(promises);

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allTasks.push(...result.value);
        } else {
          console.error('Failed to collect tasks from service:', result.reason);
        }
      });
    } catch (error) {
      console.error('Error collecting tasks:', error);
    }

    // Sort by creation date (newest first)
    return allTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async collectGitHubTasks(): Promise<RawTask[]> {
    if (!this.githubService) return [];

    try {
      const [issues, prs] = await Promise.all([
        this.githubService.getAssignedIssues(),
        this.githubService.getPullRequests(),
      ]);

      return [...issues, ...prs];
    } catch (error) {
      console.error('Failed to collect GitHub tasks:', error);
      return [];
    }
  }

  private async collectLinearTasks(): Promise<RawTask[]> {
    if (!this.linearService) return [];

    try {
      return await this.linearService.getAssignedIssues();
    } catch (error) {
      console.error('Failed to collect Linear tasks:', error);
      return [];
    }
  }

  private async collectSlackTasks(): Promise<RawTask[]> {
    if (!this.slackService) return [];

    try {
      return await this.slackService.getMentionsAndDMs();
    } catch (error) {
      console.error('Failed to collect Slack tasks:', error);
      return [];
    }
  }

  getAvailableSources(): string[] {
    const sources: string[] = [];
    if (this.githubService) sources.push('GitHub');
    if (this.linearService) sources.push('Linear');
    if (this.slackService) sources.push('Slack');
    return sources;
  }

  hasValidConfiguration(): boolean {
    return !!(this.githubService || this.linearService || this.slackService);
  }
}
