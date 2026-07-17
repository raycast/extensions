import {
  Detail,
  getPreferenceValues,
  Action,
  ActionPanel,
  Icon,
  Clipboard,
  showHUD,
  PopToRootType,
} from "@raycast/api";
import { LANGUAGES, PROMPTS } from "../constants";
import { Language } from "../types";
import { useGenerate } from "../hooks/useGenerate";

interface ResultProps {
  translationText: string;
  detectedLanguage: string;
  replyText: string;
  tone: string;
  translationStyle: string;
}

export const Result = ({ translationText, detectedLanguage, replyText, tone, translationStyle }: ResultProps) => {
  const preferences = getPreferenceValues<Preferences>();
  const { data: replyTranslationText, isLoading: isReplyTextLoading } = useGenerate(
    PROMPTS.REPLY({
      originalText: translationText,
      detectedLanguage: LANGUAGES[detectedLanguage as Language].name,
      reply: replyText,
      tone,
      translationStyle,
    }),
  );

  const { data: reTranslationTextData, isLoading: isReTranslationTextLoading } = useGenerate(
    PROMPTS.TRANSLATION(replyTranslationText, LANGUAGES[preferences.targetLanguage as Language].name),
  );

  const detectedLanguageFlag = LANGUAGES[detectedLanguage as Language].flag;
  const translationLanguageFlag = LANGUAGES[preferences.targetLanguage as Language].flag;

  const handleCopy = async () => {
    await Clipboard.copy(replyTranslationText);
    await showHUD("✅ Copied to clipboard", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  };

  return (
    <Detail
      markdown={
        replyTranslationText
          ? `### ${detectedLanguageFlag} Reply Text  \n\n\`\`\`\n${replyTranslationText}\n\`\`\`\n\n### ${translationLanguageFlag} Translation Result  \n\n\`\`\`\n${reTranslationTextData}\n\`\`\``
          : "Generating..."
      }
      isLoading={isReplyTextLoading || isReTranslationTextLoading}
      actions={
        <ActionPanel>
          <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={handleCopy} />
        </ActionPanel>
      }
    />
  );
};
