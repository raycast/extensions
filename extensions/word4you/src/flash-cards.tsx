import { Detail, ActionPanel, Action, Icon, List } from "@raycast/api";
import { useCliSetup } from "./hooks/useCliSetup";
import { useSavedMdDefinitions } from "./hooks/useSavedMdDefinitions";
import { useMdDefinitionDelete } from "./hooks/useMdDefinitionDelete";
import { useFlashCards } from "./hooks/useFlashCards";
import { isProviderConfigured } from "./config";
import { buildFrontMarkdown, buildBackMarkdown } from "./utils/flashCardUtils";
import { ProviderSetupView } from "./views/ProviderSetupView";
import { InstallationView } from "./views/InstallationView";

function FlashCardPage() {
  const { savedMdDefinitions, isLoadingSaved, loadSavedMdDefinitions } = useSavedMdDefinitions();
  const {
    currentCard,
    currentIndex,
    total,
    progress,
    isFlipped,
    isShimmering,
    handleFlip,
    handleNext,
    handlePrev,
    handleReshuffle,
    removeCurrentCard,
  } = useFlashCards(savedMdDefinitions, isLoadingSaved);

  const { handleDelete } = useMdDefinitionDelete(async () => {
    removeCurrentCard();
    await loadSavedMdDefinitions();
  });

  if (isLoadingSaved) {
    return <Detail isLoading={true} markdown="" />;
  }

  if (savedMdDefinitions.length === 0) {
    return (
      <Detail markdown="# No Saved Words Found\n\nPlease learn and save some words/phrases first before using Flash Cards." />
    );
  }

  if (!currentCard) {
    return <Detail isLoading={true} markdown="" />;
  }

  return (
    <Detail
      isLoading={isShimmering}
      markdown={isFlipped ? buildBackMarkdown(currentCard) : buildFrontMarkdown(currentCard)}
      navigationTitle={`Flash Cards (${progress})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Progress" text={progress} />
          {currentCard.tip && <Detail.Metadata.Label title="Hint" text={currentCard.tip.replace(/\n/g, " ")} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={isFlipped ? "Show Question" : "Reveal Answer"}
            icon={isFlipped ? Icon.EyeDisabled : Icon.Eye}
            onAction={handleFlip}
          />
          {currentIndex < total - 1 && (
            <Action
              title="Next Card"
              icon={Icon.ArrowRight}
              onAction={handleNext}
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
            />
          )}
          {currentIndex > 0 && (
            <Action
              title="Previous Card"
              icon={Icon.ArrowLeft}
              onAction={handlePrev}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            />
          )}
          <Action
            title="Reshuffle Deck"
            icon={Icon.Shuffle}
            onAction={handleReshuffle}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Delete Word"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => handleDelete(currentCard.timestamp)}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function FlashCardsCommand() {
  const { cliInstalled } = useCliSetup();

  if (!isProviderConfigured()) {
    return <ProviderSetupView />;
  }

  if (cliInstalled === undefined) {
    return <List isLoading={true} />;
  }

  if (!cliInstalled) {
    return <InstallationView />;
  }

  return <FlashCardPage />;
}
