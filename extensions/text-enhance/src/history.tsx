import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Detail,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { loadHistory, saveHistory, type HistoryEntry } from "./lib/storage";

export default function HistoryCommand() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        setHistory(await loadHistory());
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, []);

  async function removeEntry(entryId: string) {
    const next = history.filter((item) => item.id !== entryId);
    await saveHistory(next);
    setHistory(next);
    await showToast({
      style: Toast.Style.Success,
      title: "History item deleted",
    });
  }

  async function clearAllHistory() {
    const confirmed = await confirmAlert({
      title: "Clear entire history?",
      message: "This removes all saved enhancement results.",
      primaryAction: {
        title: "Clear History",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await saveHistory([]);
    setHistory([]);
    await showToast({
      style: Toast.Style.Success,
      title: "History cleared",
    });
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Enhancement History"
      searchBarPlaceholder="Search generated text history"
      actions={
        <ActionPanel>
          <Action
            title="Clear All History"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={clearAllHistory}
          />
        </ActionPanel>
      }
    >
      {history.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No History Yet"
          description="Generated texts will appear here after you use Enhance Text."
        />
      ) : null}

      {history.map((entry) => (
        <List.Item
          key={entry.id}
          title={getHistoryTitle(entry)}
          subtitle={`${getPurposeTitle(entry)} • ${getEnhancementTitle(entry)}`}
          accessories={[
            {
              text: getRelativeDateLabel(entry.createdAt),
              tooltip: new Date(entry.createdAt).toLocaleString(),
            },
          ]}
          detail={<List.Item.Detail markdown={renderHistoryMarkdown(entry)} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Result"
                content={entry.result}
              />
              <Action.Push
                title="Open Full Result"
                icon={Icon.Document}
                target={<HistoryDetail entry={entry} />}
              />
              <Action
                title="Delete History Item"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={async () => {
                  await removeEntry(entry.id);
                }}
              />
              <Action
                title="Clear All History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                onAction={clearAllHistory}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function HistoryDetail(props: { entry: HistoryEntry }) {
  const { entry } = props;

  return (
    <Detail
      navigationTitle="History Entry"
      markdown={renderHistoryMarkdown(entry)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Created"
            text={new Date(entry.createdAt).toLocaleString()}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Purpose"
            text={getPurposeTitle(entry)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Enhancement"
            text={getEnhancementTitle(entry)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Tone" text={entry.values.tone} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Model" text={getModelTitle(entry)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={entry.result} />
          <Action
            title="Copy Original Draft"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(entry.values.draft);
              await showToast({
                style: Toast.Style.Success,
                title: "Draft copied",
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function getHistoryTitle(entry: HistoryEntry) {
  const firstLine =
    entry.result.split("\n").find((line) => line.trim()) ?? "Generated Text";
  return firstLine.slice(0, 80);
}

function getRelativeDateLabel(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  const deltaMs = Date.now() - timestamp;

  if (deltaMs < 60_000) {
    return "Just now";
  }

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `${weeks}w ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function getPurposeTitle(entry: HistoryEntry) {
  return (
    {
      general: "Plain Text",
      email: "Email",
      reply: "Reply",
      "follow-up": "Follow-Up",
      telegram: "Telegram Message",
      slack: "Slack Message",
      "professional-update": "Professional Update",
      "meeting-summary": "Meeting Summary",
      announcement: "Announcement",
      "customer-support": "Customer Support",
      "social-post": "Social Post",
      "personal-message": "Personal Message",
      "sensitive-message": "Sensitive Message",
      request: "Request",
      proposal: "Proposal",
    }[entry.values.purpose] ?? entry.values.purpose
  );
}

function getEnhancementTitle(entry: HistoryEntry) {
  return (
    {
      clarity: "Improve Clarity",
      grammar: "Fix Grammar",
      polish: "Polish It",
      shorten: "Make Shorter",
      expand: "Make Fuller",
      funny: "Make Funny",
      sarcastic: "Make Sarcastic",
      persuasive: "Make Persuasive",
      warmer: "Make Warmer",
      stronger: "Make Stronger",
    }[entry.values.enhancement] ?? entry.values.enhancement
  );
}

function renderHistoryMarkdown(entry: HistoryEntry) {
  return [
    `# ${getHistoryTitle(entry)}`,
    "",
    "## Original Draft",
    "",
    "```text",
    entry.values.draft.replace(/```/g, "\\`\\`\\`"),
    "```",
    "",
    "## Result",
    "",
    "```text",
    entry.result.replace(/```/g, "\\`\\`\\`"),
    "```",
  ].join("\n");
}

function getModelTitle(entry: HistoryEntry) {
  return (
    {
      "claude-4-sonnet": "Claude 4 Sonnet",
      "claude-4.6-sonnet": "Claude 4.6 Sonnet",
      "claude-4.5-sonnet": "Claude 4.5 Sonnet",
      "claude-4.5-haiku": "Claude 4.5 Haiku",
      "claude-4.5-opus": "Claude 4.5 Opus",
      "claude-4.6-opus": "Claude 4.6 Opus",
      "gpt-5-mini": "GPT-5 Mini",
      "gpt-5": "GPT-5",
      "gpt-5.1": "GPT-5.1",
      "gpt-5.2": "GPT-5.2",
      "gpt-4.1": "GPT-4.1",
      "gpt-4.1-mini": "GPT-4.1 Mini",
      "gemini-2.5-flash": "Gemini 2.5 Flash",
      "gemini-2.5-pro": "Gemini 2.5 Pro",
      "gemini-3-flash": "Gemini 3 Flash",
      "gemini-3.1-pro": "Gemini 3.1 Pro",
      "gemini-3.1-flash-lite": "Gemini 3.1 Flash Lite",
      "gemini-2.5-flash-lite": "Gemini 2.5 Flash Lite",
      "perplexity-sonar": "Perplexity Sonar",
      "perplexity-sonar-pro": "Perplexity Sonar Pro",
      "grok-4.1-fast": "Grok 4.1 Fast",
      "grok-4": "Grok 4",
      "mistral-large": "Mistral Large",
      "mistral-medium": "Mistral Medium",
      "mistral-small-3": "Mistral Small 3",
      "deepseek-v3": "DeepSeek V3",
      "deepseek-r1": "DeepSeek R1",
      "qwen3-32b": "Qwen3 32B",
      "kimi-k2-instruct": "Kimi K2 Instruct",
      "gpt-4o-mini": "GPT-4o Mini",
      "gpt-4o": "GPT-4o",
      "claude-sonnet": "Claude Sonnet",
      "gemini-2-flash": "Gemini 2.0 Flash",
    }[entry.values.model] ?? entry.values.model
  );
}
