import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import type { ModelResponse } from "ollama";
import { useMemo, useState } from "react";
import { CopyAndPasteActions, TextProcessorDetail } from "@/components";
import { shortcutHint } from "@/utils";
import type { TextAction } from "./text-actions";

interface TextActionItemProps {
  action: TextAction;
  selectedModel: ModelResponse;
  selectedText: string;
  onReload: () => void;
}

export function TextActionItem({
  action,
  selectedModel,
  selectedText,
  onReload,
}: TextActionItemProps) {
  const [processedText, setProcessedText] = useState<string | null>(null);
  const [option, setOption] = useState(action.selector?.options[0] ?? "");

  const request = useMemo(
    () => ({
      model: selectedModel.name,
      prompt: action.buildPrompt(selectedText, option),
      system: action.system,
    }),
    [selectedModel.name, selectedText, option, action],
  );

  const metadata = useMemo(
    () =>
      action.selector
        ? {
            [`${action.selector.metadataLabel} · (${shortcutHint(action.selector.shortcut)})`]:
              {
                value: option,
                color: Color.Green,
              },
          }
        : undefined,
    [action.selector, option],
  );

  return (
    <List.Item
      title={action.title}
      subtitle={{ value: action.subtitle, tooltip: action.subtitle }}
      detail={
        <TextProcessorDetail
          selectedModel={selectedModel}
          selectedText={selectedText}
          request={request}
          setParentProcessedText={setProcessedText}
          metadata={metadata}
        />
      }
      actions={
        <ActionPanel>
          <CopyAndPasteActions content={processedText} />
          <Action
            title="Reload Selection"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onReload}
          />
          {action.selector && (
            <ActionPanel.Submenu
              title={action.selector.title}
              shortcut={action.selector.shortcut}
            >
              {action.selector.options.map((opt) => (
                <Action
                  key={opt}
                  title={opt}
                  autoFocus={option === opt}
                  onAction={() => setOption(opt)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
        </ActionPanel>
      }
    />
  );
}
