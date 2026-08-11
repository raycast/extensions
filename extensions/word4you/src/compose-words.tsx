import { List } from "@raycast/api";
import { useCliSetup } from "./hooks/useCliSetup";
import { useSavedMdDefinitions } from "./hooks/useSavedMdDefinitions";
import { useComposeWords } from "./hooks/useComposeWords";
import { InstallationView } from "./views/InstallationView";
import { ProviderSetupView } from "./views/ProviderSetupView";
import { ComposeWordsEmptyView } from "./views/ComposeWordsEmptyView";
import { ComposeWordsLoadingView } from "./views/ComposeWordsLoadingView";
import { ComposeWordsErrorView } from "./views/ComposeWordsErrorView";
import { ComposedSentenceDetail } from "./components/ComposedSentenceDetail";
import { isProviderConfigured } from "./config";

function ComposeWordsView() {
  const { savedMdDefinitions, isLoadingSaved } = useSavedMdDefinitions();
  const { composedSentence, isGenerating, error, currentWords, singleWordsCount, generateSentence } = useComposeWords(
    savedMdDefinitions,
    isLoadingSaved,
  );

  if (isLoadingSaved) {
    return <List isLoading={true} />;
  }

  if (singleWordsCount < 2) {
    return <ComposeWordsEmptyView singleWordsCount={singleWordsCount} />;
  }

  if (isGenerating) {
    return <ComposeWordsLoadingView currentWords={currentWords} />;
  }

  if (error) {
    return <ComposeWordsErrorView error={error} onRetry={() => generateSentence(false)} />;
  }

  if (composedSentence) {
    return (
      <ComposedSentenceDetail
        composedSentence={composedSentence}
        onRegenerate={() => generateSentence(true)}
        onGenerateNewWords={() => generateSentence(false)}
      />
    );
  }

  return <List isLoading={true} />;
}

export default function ComposeWordsCommand() {
  const { cliInstalled } = useCliSetup();

  // Show provider setup view if user hasn't configured their AI provider and API key
  if (!isProviderConfigured()) {
    return <ProviderSetupView />;
  }

  if (cliInstalled === undefined) {
    return <List isLoading={true} />;
  }

  if (!cliInstalled) {
    return <InstallationView />;
  }

  return <ComposeWordsView />;
}
