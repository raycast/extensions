import { AI, environment, getPreferenceValues, showHUD } from "@raycast/api";
import { useSelectedText } from "./hooks/useSelectedText";
import TranslationResult from "./components/TranslationResult";

export default function Command() {
  const { selectedText, loading: isSelectedTextLoading } = useSelectedText();
  const preferences = getPreferenceValues<Preferences>();

  if (!(environment.canAccess(AI) || preferences.openAIApiKey)) {
    showHUD("Error: To use this command, please either upgrade to Pro or use your own API key");
    return null;
  }

  return <TranslationResult selectedText={selectedText} isLoading={isSelectedTextLoading} />;
}
