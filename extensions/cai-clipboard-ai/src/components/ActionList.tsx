import { Action, ActionPanel, List, openExtensionPreferences, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { ContentResult, ContentType } from "../detection/types";
import { checkLLM, LLMStatus } from "../services/llm";
import { getActionsForContent } from "../actions";
import { CustomActionForm } from "./CustomActionForm";

interface Props {
  text: string;
  detection: ContentResult;
  source: "selection" | "clipboard";
}

export function ActionList({ text, detection, source }: Props) {
  const [llmStatus, setLlmStatus] = useState<LLMStatus | null>(null);

  useEffect(() => {
    checkLLM().then(setLlmStatus);
  }, []);

  const actions = getActionsForContent(text, detection, llmStatus);

  const typeLabels: Record<ContentType, string> = {
    word: "Word",
    short: "Text",
    long: "Long Text",
    meeting: "Meeting",
    address: "Address",
    url: "URL",
    json: "JSON",
  };

  const typeIcons: Record<ContentType, string> = {
    word: "✏️",
    short: "📝",
    long: "📖",
    meeting: "📅",
    address: "📍",
    url: "🔗",
    json: "{ }",
  };

  const { customActionPrompt } = getPreferenceValues<Preferences>();

  return (
    <List>
      <List.Section
        title={`${typeIcons[detection.type]} ${typeLabels[detection.type]} detected`}
        subtitle={source === "selection" ? "from selection" : "from clipboard"}
      >
        {/* Custom Action - always first with ⌘1 */}
        {llmStatus?.running && customActionPrompt && customActionPrompt.trim() && (
          <List.Item
            icon="⚡"
            title="Custom Action"
            subtitle={customActionPrompt.substring(0, 60) + (customActionPrompt.length > 60 ? "..." : "")}
            accessories={[{ text: "⌘1" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Custom Action"
                  icon="⚡"
                  target={<CustomActionForm text={text} />}
                  shortcut={{ modifiers: ["cmd"], key: "1" }}
                />
              </ActionPanel>
            }
          />
        )}

        {/* Content-specific actions - start from ⌘2 if custom action exists */}
        {actions.map((action) => {
          const hasCustomAction = llmStatus?.running && customActionPrompt && customActionPrompt.trim();
          const displayShortcut = hasCustomAction ? action.shortcut + 1 : action.shortcut;
          const actualShortcut = hasCustomAction ? action.shortcut + 1 : action.shortcut;

          return (
            <List.Item
              key={action.id}
              icon={action.icon}
              title={action.title}
              subtitle={action.subtitle}
              accessories={[{ text: `⌘${displayShortcut}` }]}
              actions={
                <ActionPanel>
                  {action.component ? (
                    <Action.Push
                      title={action.title}
                      icon={action.icon}
                      target={action.component}
                      shortcut={{ modifiers: ["cmd"], key: actualShortcut.toString() as "1" }}
                    />
                  ) : (
                    <Action
                      title={action.title}
                      icon={action.icon}
                      onAction={action.execute!}
                      shortcut={{ modifiers: ["cmd"], key: actualShortcut.toString() as "1" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {!llmStatus?.running && (
        <List.Section title="⚠️ Local LLM not available">
          <List.Item
            icon="⚙️"
            title="Open Cai Preferences"
            subtitle={llmStatus?.error || "Configure your LLM server URL"}
            actions={
              <ActionPanel>
                <Action title="Open Preferences" onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
