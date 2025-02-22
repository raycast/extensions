import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import https from "https";

interface Preferences {
  botToken: string;
  chatId: string;
}

interface FormValues {
  message: string;
}

interface RequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

function makeHttpRequest(url: string, options: RequestOptions): Promise<TelegramResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const jsonData = JSON.parse(data);

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(jsonData.description || `HTTP Error: ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error("Failed to parse response"));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

export default function Command(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit({ message }: FormValues): Promise<void> {
    try {
      setIsLoading(true);

      // Валидация
      if (!message?.trim()) {
        throw new Error("Please enter a message");
      }

      if (!preferences.botToken?.trim()) {
        throw new Error("Bot token is not set. Please check your settings.");
      }

      if (!preferences.chatId?.trim()) {
        throw new Error("Chat ID is not set. Please check your settings.");
      }

      const trimmedToken = preferences.botToken.trim();
      const body = JSON.stringify({
        chat_id: preferences.chatId.trim(),
        text: message.trim(),
        parse_mode: "HTML",
      });

      await makeHttpRequest(`https://api.telegram.org/bot${trimmedToken}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body).toString(),
        },
        body: body,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Message sent successfully",
      });
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Not Found")) {
        errorMessage =
          "Bot token is invalid. Please check your settings and make sure you copied the entire token.";
      } else if (errorMessage.includes("Unauthorized")) {
        errorMessage = "Bot is not authorized. Please check your bot token.";
      } else if (errorMessage.includes("Bad Request")) {
        errorMessage = "Invalid request. Please check your chat ID.";
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to send message",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Get New Bot Token" url="https://t.me/BotFather" />
          <Action.OpenInBrowser title="Get Chat Id" url="https://t.me/userinfobot" />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Enter your message here..."
        info="You can use HTML tags for formatting (e.g., <b>bold</b>, <i>italic</i>)"
      />
    </Form>
  );
}
