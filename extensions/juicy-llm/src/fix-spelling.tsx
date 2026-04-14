import { Action, Icon } from "@raycast/api";
import { ModelPresetPicker } from "./components/model-preset-picker";
import { ResultView } from "./components/result-view";
import { useCommandPreset } from "./hooks/use-command-preset";
import { useLLM } from "./hooks/use-llm";
import { useSelectedText } from "./hooks/use-selected-text";
import { FIX_SPELLING_SYSTEM_PROMPT } from "./prompts";

export default function FixSpelling() {
  const { data: selectedText, isLoading: textLoading } = useSelectedText();
  const { preset, showPicker, openPicker, handleSelectPreset } =
    useCommandPreset("fixspelling");

  const { result, isLoading: llmLoading } = useLLM({
    preset,
    systemPrompt: FIX_SPELLING_SYSTEM_PROMPT,
    userPrompt: selectedText ?? "",
    execute: !!selectedText && !!preset && !showPicker,
    historyMeta: { commandType: "fix-spelling", commandLabel: "Fix Spelling" },
  });

  if (showPicker) {
    return <ModelPresetPicker onSelect={handleSelectPreset} />;
  }

  return (
    <ResultView
      originalText={selectedText ?? ""}
      result={result}
      isLoading={textLoading || llmLoading || !preset}
      title={preset ? `Fix Spelling — ${preset.name}` : "Fix Spelling"}
      extraActions={
        <Action
          title="Change Model"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={openPicker}
        />
      }
    />
  );
}
