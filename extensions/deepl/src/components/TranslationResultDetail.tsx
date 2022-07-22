import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { Language, sourceLanguages, TranslationState } from "../lib/deeplapi";

export default function TranslationResultDetail({ state }: { state: TranslationState }) {
  if (state == null) {
    return null;
  }

  return (
    <Detail
      markdown={`${state.translation?.text}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Translated Text" content={state.translation?.text ?? ""} />
        </ActionPanel>
      }
      metadata={metadata(state)}
    />
  );
}

function metadata(state: TranslationState | null): JSX.Element | null {
  if (state == null) return null;

  const preferences = getPreferenceValues();
  const plan = preferences.plan == "free" ? "DeepL API Free" : "DeepL API Pro";
  const sourceLanguage =
    state.sourceLanguage ??
    sourceLanguages.find(function (language: Language) {
      return language.code == state.translation?.detected_source_language;
    });

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Source Language" text={sourceLanguage?.name ?? "Unknown"} />
      {state.usage != null && (
        <Detail.Metadata.Label
          title={`${plan} usage this period`}
          text={(state.usage.character_count / state.usage.character_limit).toLocaleString(undefined, {
            style: "percent",
            maximumFractionDigits: 2,
          })}
        />
      )}
      {state.usage != null && (
        <Detail.Metadata.Label
          title="Characters used"
          text={`${state.usage.character_count.toLocaleString()} / ${state.usage.character_limit.toLocaleString()}`}
        />
      )}
    </Detail.Metadata>
  );
}
