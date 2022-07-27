import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { Translation, Usage } from "../deepl-api";

export default function TranslationResultDetail({
  translation,
  usage,
}: {
  translation: Translation;
  usage: Usage | undefined;
}) {
  return (
    <Detail
      markdown={`${translation?.text}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Translated Text" content={translation?.text ?? ""} />
        </ActionPanel>
      }
      metadata={metadata(translation, usage)}
    />
  );
}

function metadata(translation: Translation, usage: Usage | undefined): JSX.Element | null {
  const preferences = getPreferenceValues();
  const plan = preferences.plan == "free" ? "DeepL API Free" : "DeepL API Pro";

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Source Language" text={translation.detectedSourceLanguage.name} />
      {usage != null && (
        <Detail.Metadata.Label
          title={`${plan} usage this period`}
          text={(usage.characterCount / usage.characterLimit).toLocaleString(undefined, {
            style: "percent",
            maximumFractionDigits: 2,
          })}
        />
      )}
      {usage != null && (
        <Detail.Metadata.Label
          title="Characters used"
          text={`${usage.characterCount.toLocaleString()} / ${usage.characterLimit.toLocaleString()}`}
        />
      )}
    </Detail.Metadata>
  );
}
