import { List, Action, ActionPanel, Icon, useNavigation } from "@raycast/api";
import { useCallback, useEffect } from "react";
import { useTest } from "./hooks/store/test/useTest";
import { useTestStore } from "./hooks/store/test/useTestState";
import TypingTest from "./components/typing-test";
import { LanguageSelector } from "./components/settings/language";
import { ModeSettingsForm } from "./components/settings/game-mode";
import { AppearanceSettingsForm } from "./components/settings/appearance";
import Results from "./results";
import { useSettingsStore } from "./hooks/store/settings/useSettings";
import { QUOTE_GROUPS, TYPING_AREA_ID } from "./constants";

function TestDetail() {
  return <List.Item.Detail markdown={TypingTest()} />;
}

export default function Index() {
  const { push, pop } = useNavigation();

  const onFinish = useCallback(
    (results: { onRestart: () => void }) => {
      push(
        <Results
          onRestart={() => {
            results.onRestart();
            pop();
          }}
        />,
      );
    },
    [push, pop],
  );

  const { language, mode, limit, usePunctuation, useNumbers } =
    useSettingsStore();

  const { searchText, isFinished, forcedSelectionId, quoteSource } =
    useTestStore();

  const modeSubtitle = (() => {
    if (mode === "quote") {
      const group = QUOTE_GROUPS.find((g) => g.id === limit);
      return `Quote (${group?.label || "Random"})`;
    }
    const base = mode === "time" ? `${limit}s` : `${limit} words`;
    const mods = [];
    if (usePunctuation) mods.push("Punctuation");
    if (useNumbers) mods.push("Numbers");
    return mods.length > 0 ? `${base} + ${mods.join(", ")}` : base;
  })();

  const {
    typingDataIsLoading,
    resetTest,
    handleInputChange,
    onSelectionChange,
  } = useTest(onFinish);

  useEffect(() => {
    resetTest();
  }, []);

  const testRender = TestDetail();

  return (
    <List
      isLoading={typingDataIsLoading}
      searchText={searchText}
      onSearchTextChange={handleInputChange}
      searchBarPlaceholder={isFinished ? "Finished" : "Type to start..."}
      filtering={false}
      isShowingDetail={true}
      selectedItemId={forcedSelectionId}
      onSelectionChange={onSelectionChange}
    >
      <List.Section title="Typing area">
        <List.Item
          id={TYPING_AREA_ID}
          title={quoteSource ? "Quote Test" : "Typing Test"}
          subtitle={quoteSource || modeSubtitle}
          icon={Icon.GameController}
          detail={testRender}
          actions={
            <ActionPanel>
              <Action
                title="Restart Test"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => resetTest(undefined, undefined)}
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
          detail={testRender}
          actions={
            <ActionPanel>
              <Action.Push
                title="Select Language"
                target={<LanguageSelector />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="setting-mode"
          title="Game Mode"
          subtitle={modeSubtitle}
          icon={Icon.Stopwatch}
          detail={testRender}
          actions={
            <ActionPanel>
              <Action.Push title="Change Mode" target={<ModeSettingsForm />} />
            </ActionPanel>
          }
        />
        <List.Item
          id="setting-visuals"
          title="Appearance Settings"
          subtitle="Colors, Fonts, Renderer"
          icon={Icon.Eye}
          detail={testRender}
          actions={
            <ActionPanel>
              <Action.Push
                title="Configure"
                target={<AppearanceSettingsForm />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
