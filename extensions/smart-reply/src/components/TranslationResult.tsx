import { Detail, Action, ActionPanel, useNavigation, getPreferenceValues } from "@raycast/api";
import ReplyForm from "./ReplyForm";
import { Language } from "../types";
import { LANGUAGES } from "../constants";
import { PROMPTS } from "../constants";
import { detectLanguage } from "../utils/detectLanguage";
import { useGenerate } from "../hooks/useGenerate";

interface TranslationResultProps {
  selectedText: string;
  isLoading: boolean;
}

export default function TranslationResult({ selectedText, isLoading: isSelectedTextLoading }: TranslationResultProps) {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const { data: translationText, isLoading: isTranslationLoading } = useGenerate(
    PROMPTS.TRANSLATION(selectedText, LANGUAGES[preferences.targetLanguage as Language].name),
  );

  const detectedLanguage = detectLanguage(selectedText);
  const detectedLanguageFlag = LANGUAGES[detectedLanguage as Language].flag;

  return (
    <Detail
      markdown={
        translationText
          ? `### ${detectedLanguageFlag} Translation Result  \n\n\`\`\`\n${translationText}\n\`\`\``
          : "Translating..."
      }
      isLoading={isTranslationLoading || isSelectedTextLoading}
      actions={
        <ActionPanel>
          <Action
            title="Generate Reply"
            onAction={() => {
              push(<ReplyForm translationText={translationText} detectedLanguage={detectedLanguage} />);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
