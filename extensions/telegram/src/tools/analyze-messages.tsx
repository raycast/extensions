import { getPreferenceValues } from "@raycast/api";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import * as fs from "fs";
import dedent from "dedent";
import { getChatMessages } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";
import { handleTelegramError } from "../utils/errors";

interface Arguments {
  chatId: string;
  query: string;
  limit?: number;
}

interface Preferences {
  openRouterApiKey?: string;
}

export default async function AnalyzeMessages(args: Arguments) {
  try {
    const { chatId, query } = args;
    let limit = args.limit ?? 20;

    // Cap limit to prevent excessive token usage, middle-out will handle overflow gracefully
    if (limit > 50) {
      limit = 50;
    }

    if (!chatId) {
      throw new Error("Chat ID is required");
    }

    if (!query || !query.trim()) {
      throw new Error("Please specify what you want to analyze");
    }

    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.openRouterApiKey) {
      throw new Error(
        "OpenRouter API key required. Add it in extension preferences (⌘,) or get one at https://openrouter.ai/keys",
      );
    }

    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Telegram. Please run the 'Authenticate with Telegram' command first.");
    }

    const config = getConfig();
    const messages = await getChatMessages({ config, chatId, limit, skipMediaDownload: false });

    const messageContext = messages
      .map((msg, idx) => {
        let context = `Message ${idx + 1} (ID: ${msg.id}):\n`;
        context += `Date: ${msg.date.toISOString()}\n`;
        if (msg.senderName) {
          context += `Sender: ${msg.senderName}\n`;
        }
        if (msg.text) {
          context += `Text: ${msg.text}\n`;
        }
        if (msg.media) {
          context += `Media: ${msg.media.type}`;
          if (msg.media.fileName) {
            context += ` (${msg.media.fileName})`;
          }
          if (msg.media.filePath) {
            context += ` [Image attached for analysis]`;
          }
          context += `\n`;
        }
        return context;
      })
      .join("\n");

    const contentParts: Array<{ type: "text"; text: string } | { type: "image"; image: URL }> = [];

    contentParts.push({
      type: "text",
      text: dedent`
        You are analyzing Telegram messages. Here are the messages from the chat:

        ${messageContext}

        User's question: ${query}

        Please analyze the messages and any attached images to answer the user's question. Be specific and reference message IDs when relevant.
      `,
    });

    let imageCount = 0;
    for (const msg of messages) {
      if (msg.media?.filePath && ["photo", "image"].includes(msg.media.type)) {
        if (fs.existsSync(msg.media.filePath)) {
          const imageBuffer = fs.readFileSync(msg.media.filePath);
          const base64Image = imageBuffer.toString("base64");
          const mimeType = msg.media.mimeType || "image/jpeg";

          contentParts.push({
            type: "image",
            image: `data:${mimeType};base64,${base64Image}` as unknown as URL,
          });
          imageCount++;
        }
      }
    }

    const openrouter = createOpenRouter({
      apiKey: preferences.openRouterApiKey,
    });

    const { text } = await generateText({
      model: openrouter("openai/gpt-4o-mini", {
        extraBody: {
          transforms: ["middle-out"],
        },
      }),
      messages: [
        {
          role: "user",
          content: contentParts,
        },
      ],
    });

    return {
      analysis: text,
      messagesAnalyzed: messages.length,
      imagesAnalyzed: imageCount,
    };
  } catch (error) {
    return handleTelegramError(error);
  }
}
