import { Action, getPreferenceValues, Icon } from "@raycast/api";
import { useState } from "react";
import { ModelPresetPicker } from "./components/model-preset-picker";
import { ResultView } from "./components/result-view";
import { useCommandPreset } from "./hooks/use-command-preset";
import { useLLM } from "./hooks/use-llm";
import { useSelectedText } from "./hooks/use-selected-text";
import { buildTranslateSystemPrompt } from "./prompts";
import type { Preferences } from "./types";

export default function TranslateText() {
  const { data: selectedText, isLoading: textLoading } = useSelectedText();
  const { preset, showPicker, openPicker, handleSelectPreset } =
    useCommandPreset("translate");
  const [swapped, setSwapped] = useState(false);
  const prefs = getPreferenceValues<Preferences>();

  const myLang = swapped ? prefs.foreign_language : prefs.my_language;
  const foreignLang = swapped ? prefs.my_language : prefs.foreign_language;
  const systemPrompt = buildTranslateSystemPrompt(myLang, foreignLang);

  const { result, isLoading: llmLoading } = useLLM({
    preset,
    systemPrompt,
    userPrompt: selectedText ?? "",
    execute: !!selectedText && !!preset && !showPicker,
    historyMeta: { commandType: "translate", commandLabel: "Translate" },
  });

  if (showPicker) {
    return <ModelPresetPicker onSelect={handleSelectPreset} />;
  }

  return (
    <ResultView
      originalText={selectedText ?? ""}
      result={result}
      isLoading={textLoading || llmLoading || !preset}
      title={preset ? `Translate — ${preset.name}` : "Translate"}
      extraActions={
        <>
          <Action
            title={`Translate to ${swapped ? prefs.my_language : prefs.foreign_language}`}
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => setSwapped((prev) => !prev)}
          />
          <Action
            title="Change Model"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            onAction={openPicker}
          />
        </>
      }
    />
  );
}
