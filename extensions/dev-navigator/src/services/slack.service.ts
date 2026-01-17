import axios, { AxiosInstance } from 'axios';
import { RawTask } from '../types/priority.types';

export class SlackService {
  private client: AxiosInstance;
  private token: string;

  constructor(token: string) {
    this.token = token;
    this.client = axios.create({
      baseURL: 'https://slack.com/api',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getMentionsAndDMs(): Promise<RawTask[]> {
    try {
      // Get user info first
      const userResponse = await this.client.post('/auth.test');
      const userId = userResponse.data.user_id;

      // Get channels the user is in
      const channelsResponse = await this.client.post('/conversations.list', {
        types: 'public_channel,private_channel,mpim,im',
        limit: 100,
      });

      const channels = channelsResponse.data.channels || [];
      const tasks: RawTask[] = [];

      // Check each channel for recent mentions and DMs
      for (const channel of channels) {
        const channelTasks = await this.getChannelTasks(channel.id, userId);
        tasks.push(...channelTasks);
      }

      return tasks;
    } catch (error) {
      console.error('Failed to fetch Slack data:', error);
      return [];
    }
  }

  private async getChannelTasks(channelId: string, userId: string): Promise<RawTask[]> {
    try {
      // Get recent messages from the channel
      const messagesResponse = await this.client.post('/conversations.history', {
        channel: channelId,
        limit: 50,
        oldest: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000).toString(), // Last 24 hours
      });

      const messages = messagesResponse.data.messages || [];
      const tasks: RawTask[] = [];

      for (const message of messages) {
        // Check for mentions
        if (message.text && message.text.includes(`<@${userId}>`)) {
          tasks.push({
            id: `slack-mention-${message.ts}`,
            title: `Mention in ${await this.getChannelName(channelId)}`,
            description: message.text.replace(/<@\w+>/g, '@user'), // Sanitize mentions
            source: 'slack',
            type: 'mention',
            url: `slack://channel?team=${await this.getTeamId()}&id=${channelId}`,
            createdAt: new Date(parseFloat(message.ts) * 1000),
            updatedAt: new Date(parseFloat(message.ts) * 1000),
            priority: this.calculatePriority(message, 'mention'),
            metadata: {
              channelId,
              channelName: await this.getChannelName(channelId),
              messageTs: message.ts,
              user: message.user,
            },
          });
        }

        // Check for DMs (direct messages)
        if (channelId.startsWith('D') && message.user !== userId) {
          tasks.push({
            id: `slack-dm-${message.ts}`,
            title: `DM from ${await this.getUserName(message.user)}`,
            description: message.text,
            source: 'slack',
            type: 'direct_message',
            url: `slack://channel?team=${await this.getTeamId()}&id=${channelId}`,
            createdAt: new Date(parseFloat(message.ts) * 1000),
            updatedAt: new Date(parseFloat(message.ts) * 1000),
            priority: this.calculatePriority(message, 'dm'),
            metadata: {
              channelId,
              channelName: 'Direct Message',
              messageTs: message.ts,
              user: message.user,
            },
          });
        }
      }

      return tasks;
    } catch (error) {
      console.error(`Failed to fetch messages from channel ${channelId}:`, error);
      return [];
    }
  }

  private async getChannelName(channelId: string): Promise<string> {
    try {
      const response = await this.client.post('/conversations.info', {
        channel: channelId,
      });
      return response.data.channel?.name || 'Unknown Channel';
    } catch {
      return 'Unknown Channel';
    }
  }

  private async getUserName(userId: string): Promise<string> {
    try {
      const response = await this.client.post('/users.info', {
        user: userId,
      });
      return response.data.user?.name || 'Unknown User';
    } catch {
      return 'Unknown User';
    }
  }

  private async getTeamId(): Promise<string> {
    try {
      const response = await this.client.post('/auth.test');
      return response.data.team_id || '';
    } catch {
      return '';
    }
  }

  private calculatePriority(message: any, type: 'mention' | 'dm'): number {
    let priority = 6; // Default medium priority

    // Mentions are generally more urgent than DMs
    if (type === 'mention') {
      priority += 1;
    }

    // Check for urgent keywords in the message
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'blocking'];
    const hasUrgentKeyword = urgentKeywords.some((keyword) =>
      message.text?.toLowerCase().includes(keyword)
    );

    if (hasUrgentKeyword) {
      priority += 2;
    }

    // Recent messages get higher priority
    const messageAge = Date.now() - parseFloat(message.ts) * 1000;
    const hoursOld = messageAge / (1000 * 60 * 60);

    if (hoursOld < 1) {
      priority += 1; // Very recent
    } else if (hoursOld < 6) {
      priority += 0; // Recent
    } else {
      priority -= 1; // Older
    }

    return Math.max(1, Math.min(10, priority));
  }
}
