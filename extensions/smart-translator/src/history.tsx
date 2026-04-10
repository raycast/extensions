import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Image,
  List,
  LocalStorage,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import { TranslateScreen, LANGUAGES, getModelSections } from "./translate";

const HISTORY_KEY = "translationHistory";
const FAVICON_OPTIONS = { mask: Image.Mask.RoundedRectangle } as const;

const MODEL_ICONS: Record<string, Image.ImageLike> = {
  openai: getFavicon("https://openai.com", FAVICON_OPTIONS),
  anthropic: getFavicon("https://anthropic.com", FAVICON_OPTIONS),
  google: getFavicon("https://deepmind.google", FAVICON_OPTIONS),
  xai: getFavicon("https://x.ai", FAVICON_OPTIONS),
  together: getFavicon("https://deepseek.com", FAVICON_OPTIONS),
  groq: getFavicon("https://deepseek.com", FAVICON_OPTIONS),
  mistral: getFavicon("https://mistral.ai", FAVICON_OPTIONS),
  llama: getFavicon("https://meta.com", FAVICON_OPTIONS),
  perplexity: getFavicon("https://perplexity.ai", FAVICON_OPTIONS),
  mixtral: getFavicon("https://mistral.ai", FAVICON_OPTIONS),
};

function getModelIcon(modelName: string): Image.ImageLike {
  const lower = modelName.toLowerCase();
  if (lower.includes("gpt") || lower.includes("o1") || lower.includes("o3"))
    return MODEL_ICONS.openai;
  if (lower.includes("claude")) return MODEL_ICONS.anthropic;
  if (lower.includes("gemini")) return MODEL_ICONS.google;
  if (lower.includes("grok")) return MODEL_ICONS.xai;
  if (lower.includes("deepseek")) return MODEL_ICONS.together;
  if (lower.includes("llama")) return MODEL_ICONS.llama;
  if (
    lower.includes("mistral") ||
    lower.includes("mixtral") ||
    lower.includes("codestral")
  )
    return MODEL_ICONS.mistral;
  if (lower.includes("sonar")) return MODEL_ICONS.perplexity;
  return Icon.ComputerChip;
}

interface HistoryEntry {
  id: string;
  originalText: string;
  sections: { key: string; text: string }[];
  baseName: string;
  targetName: string;
  modelName: string;
  timestamp: number;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function HistoryDetail({ entry }: { entry: HistoryEntry }) {
  const markdown = entry.sections
    .map(({ key, text }) => `### ${key}\n${text}`)
    .join("\n\n---\n\n");

  const modelSections = useMemo(() => getModelSections(), []);
  const base = LANGUAGES[entry.baseName];
  const target = LANGUAGES[entry.targetName];
  const inputIsBase = entry.sections[0]?.key !== entry.baseName;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Original" text={entry.originalText} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Languages"
            text={`${entry.baseName} ↔ ${entry.targetName}`}
          />
          <Detail.Metadata.Label title="Model" text={entry.modelName} />
          <Detail.Metadata.Label
            title="Date"
            text={formatDate(entry.timestamp)}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {entry.sections.map(({ key, text }, i) => (
            <Action.CopyToClipboard
              key={key}
              title={`Copy ${key}`}
              content={text}
              shortcut={
                i < 4
                  ? {
                      modifiers: ["cmd"],
                      key: String(i + 1) as "1" | "2" | "3" | "4",
                    }
                  : undefined
              }
            />
          ))}
          <Action.CopyToClipboard
            title="Copy All"
            content={markdown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {base && target && (
            <ActionPanel.Submenu
              title="Re-translate with Model"
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            >
              {modelSections.map((section) =>
                section.models.map((m) => (
                  <Action.Push
                    key={m.value}
                    title={`${section.name}: ${m.label}`}
                    icon={section.icon}
                    target={
                      <TranslateScreen
                        text={entry.originalText}
                        initialModel={m.value}
                        initialModelName={m.label}
                        base={base}
                        target={target}
                        detectMode="fast"
                        modelSections={modelSections}
                        initialIsBase={inputIsBase}
                      />
                    }
                  />
                )),
              )}
            </ActionPanel.Submenu>
          )}
        </ActionPanel>
      }
    />
  );
}

export default function HistoryCommand() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LocalStorage.getItem<string>(HISTORY_KEY).then((raw) => {
      if (raw) setHistory(JSON.parse(raw));
      setIsLoading(false);
    });
  }, []);

  async function clearHistory() {
    if (
      await confirmAlert({
        title: "Clear all history?",
        primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await LocalStorage.removeItem(HISTORY_KEY);
      setHistory([]);
    }
  }

  async function deleteEntry(id: string) {
    const updated = history.filter((e) => e.id !== id);
    setHistory(updated);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }

  if (!isLoading && history.length === 0) {
    return <Detail markdown="No translation history yet." />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search history...">
      {history.map((entry) => {
        const preview =
          entry.originalText.length > 60
            ? entry.originalText.slice(0, 60) + "..."
            : entry.originalText;
        return (
          <List.Item
            key={entry.id}
            title={preview}
            accessories={[
              { text: `${entry.baseName} ↔ ${entry.targetName}` },
              { icon: getModelIcon(entry.modelName) },
              { text: formatDate(entry.timestamp) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View"
                  icon={Icon.Eye}
                  target={<HistoryDetail entry={entry} />}
                />
                <Action.CopyToClipboard
                  title="Copy First Tone"
                  content={
                    entry.sections.find((s) => s.key !== entry.baseName)
                      ?.text ?? ""
                  }
                  shortcut={{ modifiers: ["cmd"], key: "1" }}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => deleteEntry(entry.id)}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={clearHistory}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
