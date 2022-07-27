import { Action, ActionPanel, getPreferenceValues, Icon, List, useNavigation } from "@raycast/api";
import { Translation, Usage } from "../deepl-api";
import TranslationResultDetail from "./TranslationResultDetail";

export default function TranslationResultListItem({
  translation,
  usage,
}: {
  translation: Translation;
  usage: Usage | undefined;
}) {
  const { push } = useNavigation();
  const title = `Translated from ${translation.detectedSourceLanguage.name}:`;
  const subtitle = usage ? generateSubtitle(usage) : "";

  return (
    <List.Section title={title} subtitle={subtitle}>
      <List.Item
        title={translation.text}
        actions={
          <ActionPanel>
            <Action
              title="View Translation"
              icon={{ source: Icon.AppWindowSidebarRight }}
              onAction={() => push(<TranslationResultDetail translation={translation} usage={usage} />)}
            />
            <Action.CopyToClipboard title="Copy Translated Text" content={translation.text} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

function generateSubtitle(usage: Usage | null): string {
  if (usage == null) {
    return "";
  }

  const usagePercentage = (usage.characterCount / usage.characterLimit).toLocaleString(undefined, {
    style: "percent",
    maximumFractionDigits: 2,
  });

  const characterCount = usage.characterCount.toLocaleString();
  const characterLimit = usage.characterLimit.toLocaleString();
  const plan = getPreferenceValues().plan == "free" ? "DeepL API Free" : "DeepL API Pro";

  return `${usagePercentage} of ${plan} plan used this period (${characterCount} / ${characterLimit} characters)`;
}
