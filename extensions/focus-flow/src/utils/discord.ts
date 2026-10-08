import type { DiscordEmbed } from "../types";

const TIMEOUT = 10000; // 10 seconds

export class DiscordAPI {
  static async sendMessage(webhookUrl: string, content?: string, embeds?: DiscordEmbed[]): Promise<{ id: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(`${webhookUrl}?wait=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, embeds }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API error: ${response.status} - ${errorText}`);
      }

      return (await response.json()) as { id: string };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async getMessage(webhookUrl: string, messageId: string): Promise<{ content: string; embeds: DiscordEmbed[] }> {
    const { id, token } = this.parseWebhookUrl(webhookUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(`https://discord.com/api/webhooks/${id}/${token}/messages/${messageId}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Team not found or deleted");
        }
        const errorText = await response.text();
        throw new Error(`Discord API error: ${response.status} - ${errorText}`);
      }

      return (await response.json()) as { content: string; embeds: DiscordEmbed[] };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async updateMessage(
    webhookUrl: string,
    messageId: string,
    content?: string,
    embeds?: DiscordEmbed[],
  ): Promise<void> {
    const { id, token } = this.parseWebhookUrl(webhookUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(`https://discord.com/api/webhooks/${id}/${token}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, embeds }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API error: ${response.status} - ${errorText}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static parseWebhookUrl(webhookUrl: string): { id: string; token: string } {
    const match = webhookUrl.match(/webhooks\/(\d+)\/([^/]+)/);
    if (!match) {
      throw new Error("Invalid webhook URL format");
    }
    return { id: match[1], token: match[2] };
  }
}
