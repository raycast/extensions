import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";

const execAsync = promisify(exec);

interface Preferences {
  webchatUrl: string;
  agentId?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

async function sendMessage(message: string, agentId?: string): Promise<string> {
  const agentFlag = agentId ? `--agent ${agentId}` : "";
  const escapedMessage = message.replace(/'/g, "'\\''");

  try {
    const { stdout } = await execAsync(
      `/opt/homebrew/bin/clawdbot agent --local --session-id raycast -m '${escapedMessage}' ${agentFlag} --timeout 120`,
      {
        encoding: "utf-8",
        timeout: 130000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PATH: `/opt/homebrew/bin:${process.env.PATH}` },
      },
    );
    return stdout.trim();
  } catch (error: unknown) {
    const err = error as { message?: string; stderr?: string };
    throw new Error(err.stderr || err.message || "Failed to send message");
  }
}

function formatConversation(messages: Message[]): string {
  if (messages.length === 0) return "";

  return messages
    .map((msg) => {
      if (msg.role === "user") {
        return `**You:** ${msg.content}`;
      } else {
        return `**Clawdbot:**\n${msg.content}`;
      }
    })
    .join("\n\n---\n\n");
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(values: { message: string }) {
    const userMessage = values.message.trim();
    if (!userMessage) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a message",
      });
      return;
    }

    // Add user message to history
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    await showToast({
      style: Toast.Style.Animated,
      title: "Thinking...",
      message: "Clawdbot is processing",
    });

    try {
      const result = await sendMessage(userMessage, preferences.agentId);
      setMessages([...newMessages, { role: "assistant", content: result }]);
      setInputValue("");
      await showToast({
        style: Toast.Style.Success,
        title: "Response received",
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err.message || "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const lastResponse = messages
    .filter((m) => m.role === "assistant")
    .pop()?.content;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
          {lastResponse && (
            <>
              <Action.CopyToClipboard
                title="Copy Last Response"
                content={lastResponse}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.Paste
                title="Paste Last Response"
                content={lastResponse}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
            </>
          )}
          <Action
            title="Clear Chat"
            onAction={() => setMessages([])}
            shortcut={{ modifiers: ["cmd"], key: "k" }}
          />
        </ActionPanel>
      }
    >
      {messages.length > 0 && (
        <Form.Description
          title="Conversation"
          text={formatConversation(messages)}
        />
      )}
      <Form.TextField
        id="message"
        title="Message"
        placeholder={
          messages.length === 0
            ? "Ask Clawdbot anything..."
            : "Continue the conversation..."
        }
        value={inputValue}
        onChange={setInputValue}
        autoFocus
      />
    </Form>
  );
}
