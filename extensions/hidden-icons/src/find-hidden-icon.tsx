import { Action, ActionPanel, getPreferenceValues, Grid, Icon, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getHistoryScore } from "./utils/find-icons-utils";
import ScorePage from "./score-page";
import { GenerateFindOutIcons, startGame } from "./hooks/hooks";
import { modes } from "./utils/constants";
import { Preferences } from "./types/preferences";
import { ActionOpenPreferences } from "./components/action-open-preferences";

export default function FindHiddenIcon() {
  const { allCountDownTime } = getPreferenceValues<Preferences>();
  const [difficultyMode, setDifficultyMode] = useState<string>("easy");
  const [refreshIcon, setRefreshIcon] = useState<number>(0);
  const [lastRandomRow, setLastRandomRow] = useState<number>(0);

  const { push } = useNavigation();
  const { score, leftTime, showScore, setScore, isGaming, setIsGaming } = startGame(parseInt(allCountDownTime));
  const { findOutIcons, targetIcon, targetIndex } = GenerateFindOutIcons(
    isGaming,
    difficultyMode,
    lastRandomRow,
    refreshIcon
  );

  useEffect(() => {
    async function _fetchHistoryScore() {
      if (isGaming) {
        const historyScore = await getHistoryScore();
        push(<ScorePage myScore={{ mode: difficultyMode, score: score }} historyScore={historyScore} />);
      }
    }

    _fetchHistoryScore().then();
  }, [showScore]);

  return (
    <Grid
      itemSize={Grid.ItemSize.Small}
      enableFiltering={false}
      searchBarPlaceholder={`Find the hidden icon in ${allCountDownTime} seconds`}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip={"Difficulty mode"}
          storeValue={true}
          onChange={(newValue) => {
            setDifficultyMode(newValue);
          }}
        >
          {isGaming ? (
            <Grid.Dropdown.Item key={difficultyMode} title={difficultyMode} value={difficultyMode} />
          ) : (
            modes.map((value) => {
              return <Grid.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
            })
          )}
        </Grid.Dropdown>
      }
    >
      {!isGaming ? (
        <Grid.EmptyView
          title={`Press ↩︎ to start game`}
          icon={"find-icons.png"}
          actions={
            <ActionPanel>
              <Action
                title={"Start Game"}
                icon={Icon.Binoculars}
                onAction={() => {
                  setIsGaming(true);
                }}
              />
              <Action
                title={"Score History"}
                icon={Icon.TextDocument}
                shortcut={{ modifiers: ["cmd"], key: "h" }}
                onAction={async () => {
                  const historyScore = await getHistoryScore();
                  push(<ScorePage myScore={{ mode: difficultyMode, score: 0 }} historyScore={historyScore} />);
                }}
              />
              <ActionOpenPreferences />
            </ActionPanel>
          }
        />
      ) : (
        findOutIcons.map((value, index) => (
          <Grid.Item
            key={"index" + index}
            content={value}
            actions={
              <ActionPanel>
                <Action
                  title={isGaming ? `Find ${targetIcon}   Score: ${score}   Time left: ${leftTime}s` : "Start Game"}
                  icon={Icon.Star}
                  onAction={async () => {
                    setLastRandomRow(index);
                    if (targetIndex == index) {
                      setScore(score + 1);
                    }
                    setRefreshIcon(Date.now());
                  }}
                />
                <ActionOpenPreferences />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
