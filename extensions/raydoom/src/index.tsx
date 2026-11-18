import { List, ActionPanel, Action, Icon, Detail } from "@raycast/api";
import { useState } from "react";
import { DIFFICULTY_LEVELS, EPISODES, INSTRUCTIONS, GameConfig, DEFAULT_CONFIG } from "./menu-config";
import RunDoom from "./run-doom.js";

enum MenuScreen {
  EPISODE_SELECT,
  DIFFICULTY_SELECT,
  INSTRUCTIONS,
  GAME,
}

export default function Command() {
  const [screen, setScreen] = useState<MenuScreen>(MenuScreen.EPISODE_SELECT);
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);

  const selectEpisode = (episode: number) => {
    setConfig({ ...config, episode });
    setScreen(MenuScreen.DIFFICULTY_SELECT);
  };

  const selectDifficulty = (difficulty: number) => {
    setConfig({ ...config, difficulty });
    setScreen(MenuScreen.INSTRUCTIONS);
  };

  const startGame = () => {
    setScreen(MenuScreen.GAME);
  };

  const showInstructions = () => {
    setScreen(MenuScreen.INSTRUCTIONS);
  };

  const goBack = () => {
    if (screen === MenuScreen.DIFFICULTY_SELECT) {
      setScreen(MenuScreen.EPISODE_SELECT);
    } else if (screen === MenuScreen.INSTRUCTIONS) {
      setScreen(MenuScreen.DIFFICULTY_SELECT);
    }
  };

  if (screen === MenuScreen.GAME) {
    return <RunDoom config={config} />;
  }

  if (screen === MenuScreen.INSTRUCTIONS) {
    return (
      <Detail
        markdown={INSTRUCTIONS}
        actions={
          <ActionPanel>
            <Action title="Start Game" icon={Icon.Play} onAction={startGame} />
            <Action
              title="Back"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              onAction={goBack}
            />
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Episode" text={EPISODES[config.episode - 1].title} />
            <Detail.Metadata.Label title="Difficulty" text={DIFFICULTY_LEVELS[config.difficulty - 1].title} />
          </Detail.Metadata>
        }
      />
    );
  }

  if (screen === MenuScreen.EPISODE_SELECT) {
    return (
      <List navigationTitle="DOOM - Select Episode" searchBarPlaceholder="Search episodes...">
        <List.Section title="Choose Your Episode">
          {EPISODES.map((episode, index) => (
            <List.Item
              key={episode.id}
              title={episode.title}
              subtitle={episode.description}
              icon={Icon.Circle}
              accessories={[{ text: `Episode ${index + 1}` }]}
              actions={
                <ActionPanel>
                  <Action title="Select Episode" icon={Icon.CheckCircle} onAction={() => selectEpisode(index + 1)} />
                  <Action
                    title="View Instructions"
                    icon={Icon.Book}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                    onAction={showInstructions}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>

        <List.Section title="Information">
          <List.Item
            title="About This Version"
            subtitle="DOOM Shareware - Episode 1 only"
            icon={Icon.Info}
            accessories={[{ text: "v1.9" }]}
          />
        </List.Section>
      </List>
    );
  }

  if (screen === MenuScreen.DIFFICULTY_SELECT) {
    return (
      <List
        navigationTitle={`DOOM - Select Difficulty (${EPISODES[config.episode - 1].title})`}
        searchBarPlaceholder="Choose your challenge..."
      >
        <List.Section title="Choose Your Difficulty">
          {DIFFICULTY_LEVELS.map((difficulty, index) => {
            const isRecommended = index === 2; // "Hurt me plenty" is recommended
            return (
              <List.Item
                key={difficulty.id}
                title={difficulty.title}
                subtitle={difficulty.description}
                icon={
                  index === 0
                    ? Icon.SpeechBubble
                    : index === 1
                      ? Icon.Circle
                      : index === 2
                        ? Icon.Star
                        : index === 3
                          ? Icon.Bolt
                          : Icon.ExclamationMark
                }
                accessories={[
                  ...(isRecommended ? [{ text: "Recommended", icon: Icon.Star }] : []),
                  { text: `Skill ${index + 1}` },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Select Difficulty"
                      icon={Icon.CheckCircle}
                      onAction={() => selectDifficulty(index + 1)}
                    />
                    <Action
                      title="Back to Episodes"
                      icon={Icon.ArrowLeft}
                      shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                      onAction={goBack}
                    />
                    <Action
                      title="View Instructions"
                      icon={Icon.Book}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                      onAction={showInstructions}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>

        <List.Section title="Selected">
          <List.Item title={`Episode: ${EPISODES[config.episode - 1].title}`} icon={Icon.Checkmark} />
        </List.Section>
      </List>
    );
  }

  return null;
}
