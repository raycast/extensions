/**
 * Type definitions for the Slack templated message extension.
 */

/**
 * Represents a Slack channel with its ID and name
 */
export interface Channel {
  id: string;
  name: string;
}

/**
 * Represents a message template with channel and thread information
 */
export interface SlackTemplate {
  name: string;
  message: string;
  slackChannelId: string;
  slackChannelName: string;
  threadTimestamp?: string;
}
