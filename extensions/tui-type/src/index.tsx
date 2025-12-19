import { List, Action, ActionPanel, Icon, useNavigation } from "@raycast/api";
import { useCallback } from "react";
import { useTypingGame } from "./hooks/useTypingGame";
import TypingTest from "./components/typing-test";
import { LanguageSelector } from "./components/settings/language";
import { ModeSettingsForm } from "./components/settings/game-mode";
import { AppearanceSettingsForm } from "./components/settings/appearance";
import Results from "./results";

function GameDetail({
  gameState,
}: {
  gameState: ReturnType<typeof useTypingGame>;
}) {
  const markdown = TypingTest(gameState);
  return <List.Item.Detail markdown={markdown} />;
}

export default function TypingGame() {
  const { push, pop } = useNavigation();

  const onFinish = useCallback(
    (results: {
      correctChars: number;
      wrongChars: number;
      typedChars: number;
      timeInMinutes: number;
      onRestart: () => void;
    }) => {
      push(
        <Results
          correctChars={results.correctChars}
          wrongChars={results.wrongChars}
          typedChars={results.typedChars}
          timeInMinutes={results.timeInMinutes}
          onRestart={() => {
            results.onRestart();
            pop();
          }}
        />,
      );
    },
    [push, pop],
  );

  const gameState = useTypingGame(onFinish);

  const {
    // State
    searchText,
    isFinished,
    isLoadingWords,
    isLoadingQuotes,
    forcedSelectionId,
    quoteSource,
    modeSubtitle,

    // Settings
    mode,
    limit,
    language,
    renderMode,
    updateFreq,
    svgSettings,
    termSettings,
    usePunctuation,
    useNumbers,

    // Actions
    setModeAndReset,
    setLanguage,
    setRenderMode,
    setUpdateFreq,
    setSvgSettings,
    setTermSettings,
    resetGame,
    handleInputChange,
    onSelectionChange,
  } = gameState;

  return (
    <List
      isLoading={isLoadingWords || isLoadingQuotes}
      searchText={searchText}
      onSearchTextChange={handleInputChange}
      searchBarPlaceholder={isFinished ? "Finished" : "Type to start..."}
      enableFiltering={false}
      isShowingDetail={true}
      selectedItemId={forcedSelectionId}
      onSelectionChange={onSelectionChange}
    >
      <List.Section title="Typing area">
        <List.Item
          id="typing-area"
          title={quoteSource ? "Quote Test" : "Typing Test"}
          subtitle={quoteSource || modeSubtitle}
          icon={Icon.GameController}
          detail={<GameDetail gameState={gameState} />}
          actions={
            <ActionPanel>
              <Action
                title="Restart Test"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => resetGame(undefined, undefined, true)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Settings">
        <List.Item
          id="setting-lang"
          title="Language"
          subtitle={language}
          icon={Icon.Globe}
          detail={<GameDetail gameState={gameState} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Select Language"
                target={
                  <LanguageSelector
                    currentLanguage={language}
                    onSelect={setLanguage}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="setting-mode"
          title="Game Mode"
          subtitle={modeSubtitle}
          icon={Icon.Stopwatch}
          detail={<GameDetail gameState={gameState} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Change Mode"
                target={
                  <ModeSettingsForm
                    currentMode={mode}
                    currentLimit={limit}
                    includePunctuation={usePunctuation}
                    includeNumbers={useNumbers}
                    onSave={setModeAndReset}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="setting-visuals"
          title="Appearance Settings"
          subtitle="Colors, Fonts, Renderer"
          icon={Icon.Eye}
          detail={<GameDetail gameState={gameState} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Configure"
                target={
                  <AppearanceSettingsForm
                    renderMode={renderMode}
                    setRenderMode={setRenderMode}
                    freq={updateFreq}
                    setFreq={setUpdateFreq}
                    svgSettings={svgSettings}
                    setSvgSettings={setSvgSettings}
                    termSettings={termSettings}
                    setTermSettings={setTermSettings}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
