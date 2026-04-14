import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { resolveIcon } from "./components/custom-prompt-form";
import { ResultView } from "./components/result-view";
import { ensureDefaults } from "./defaults";
import { useLLM } from "./hooks/use-llm";
import { useSelectedText } from "./hooks/use-selected-text";
import { getCustomPrompts, getModelPreset } from "./storage";
import type { CustomPrompt, ModelPreset } from "./types";

export default function CustomPromptsCommand() {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [presetNames, setPresetNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadPrompts = useCallback(async () => {
    await ensureDefaults();
    const data = await getCustomPrompts();
    setPrompts(data);

    const names: Record<string, string> = {};
    for (const p of data) {
      if (!names[p.modelPresetId]) {
        const preset = await getModelPreset(p.modelPresetId);
        names[p.modelPresetId] = preset?.name ?? "Unknown";
      }
    }
    setPresetNames(names);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  return (
    <List isLoading={isLoading} navigationTitle="Custom Prompts">
      {prompts.map((prompt) => (
        <List.Item
          key={prompt.id}
          title={prompt.name}
          accessories={[{ text: presetNames[prompt.modelPresetId] ?? "..." }]}
          icon={resolveIcon(prompt.icon)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Run"
                icon={Icon.Play}
                target={<RunPrompt customPrompt={prompt} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RunPrompt({ customPrompt }: { customPrompt: CustomPrompt }) {
  const { data: selectedText, isLoading: textLoading } = useSelectedText();
  const [preset, setPreset] = useState<ModelPreset | undefined>();

  useEffect(() => {
    (async () => {
      const p = await getModelPreset(customPrompt.modelPresetId);
      setPreset(p);
    })();
  }, [customPrompt.modelPresetId]);

  const { result, isLoading: llmLoading } = useLLM({
    preset,
    systemPrompt: customPrompt.prompt,
    userPrompt: selectedText ?? "",
    execute: !!selectedText && !!preset,
    historyMeta: {
      commandType: "custom-prompt",
      commandLabel: customPrompt.name,
    },
  });

  return (
    <ResultView
      originalText={selectedText ?? ""}
      result={result}
      isLoading={textLoading || llmLoading || !preset}
      title={customPrompt.name}
    />
  );
}
