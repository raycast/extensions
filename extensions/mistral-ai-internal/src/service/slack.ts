import { WebClient } from "@slack/web-api";
import { getPreferences } from "../preferences";

// Slack API interfaces
export interface SlackUserProfile {
  display_name?: string;
  email?: string;
  image_192?: string;
  [key: string]: unknown;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: SlackUserProfile;
  [key: string]: unknown;
}

// Slack Block Kit interfaces
export interface SlackTextObject {
  type: "plain_text" | "mrkdwn";
  text: string;
  emoji?: boolean;
  verbatim?: boolean;
}

export interface SlackBlockElement {
  type: string;
  [key: string]: unknown;
}

export interface SlackBlock {
  type:
    | "section"
    | "divider"
    | "header"
    | "image"
    | "actions"
    | "context"
    | string;
  text?: SlackTextObject;
  fields?: SlackTextObject[];
  elements?: SlackBlockElement[];
  block_id?: string;
  [key: string]: unknown;
}

/**
 * Slack service for interacting with Slack API
 */
export class SlackService {
  private client: WebClient;

  constructor() {
    const { slackOauthToken } = getPreferences();

    if (!slackOauthToken) {
      throw new Error(
        "Slack OAuth token is required. Please set it in Raycast preferences.",
      );
    }

    this.client = new WebClient(slackOauthToken);
  }

  /**
   * Look up a Slack user by their email address
   * @param email The email address of the user to look up
   * @returns Promise with the user information including their Slack handle
   */
  async getUserByEmail(email: string) {
    try {
      const result = await this.client.users.lookupByEmail({
        email: email.trim().toLowerCase(),
      });

      if (!result.ok || !result.user) {
        return {
          success: false,
          error: result.error || "User not found",
        };
      }

      const user = result.user as SlackUser;

      return {
        success: true,
        userId: user.id,
        username: user.name,
        realName: user.real_name,
        displayName: user.profile?.display_name || user.name,
        handle: `<@${user.id}>`,
        email: user.profile?.email,
        avatar: user.profile?.image_192,
      };
    } catch (error) {
      console.error("Error looking up Slack user by email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process a message to properly format Slack mentions
   * @param message The message to process
   * @returns The processed message with properly formatted mentions
   */
  private processMessageMentions(message: string): string {
    const mentionRegex = /@([\w.-]+)/g;
    return message.replace(mentionRegex, (match, username) => {
      if (match.startsWith("<@") && match.endsWith(">")) {
        return match;
      }

      if (username.startsWith("U") && username.length > 8) {
        return `<@${username}>`;
      }

      return match;
    });
  }

  /**
   * Send a message to a Slack channel
   * @param channelId The ID of the channel to send the message to
   * @param message The message text to send
   * @returns Promise with the result of the API call
   */
  async sendMessage(channelId: string, message: string) {
    try {
      // Process the message to handle mentions properly
      const processedMessage = this.processMessageMentions(message);

      const result = await this.client.chat.postMessage({
        channel: channelId,
        text: processedMessage,
        parse: "full",
        link_names: true,
      });

      return {
        success: true,
        messageId: result.ts,
        channelId: result.channel,
      };
    } catch (error) {
      console.error("Error sending message to Slack:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send a message with blocks (rich formatting) to a Slack channel
   * @param channelId The ID of the channel to send the message to
   * @param blocks The blocks to include in the message
   * @param text Plain text fallback for the message
   * @returns Promise with the result of the API call
   */
  async sendRichMessage(
    channelId: string,
    blocks: SlackBlock[],
    text: string = "",
  ) {
    try {
      // Process the text to handle mentions properly
      const processedText = this.processMessageMentions(text);

      // Process any text in blocks to handle mentions
      const processedBlocks = blocks.map((block) => {
        // Process text in the block if it exists
        if (block.text && block.text.text) {
          return {
            ...block,
            text: {
              ...block.text,
              text: this.processMessageMentions(block.text.text),
            },
          };
        }
        return block;
      });

      const result = await this.client.chat.postMessage({
        channel: channelId,
        blocks: processedBlocks,
        text: processedText,
        parse: "full",
        link_names: true,
      });

      return {
        success: true,
        messageId: result.ts,
        channelId: result.channel,
      };
    } catch (error) {
      console.error("Error sending rich message to Slack:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

const slackService = new SlackService();
export default slackService;
