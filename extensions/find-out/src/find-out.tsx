import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { allCountDownTime, getHistoryScore, getRandomFindOutIcon, modes } from "./utils/find-out-utils";
import ScorePage from "./score-page";
import { clearInterval } from "timers";

export default function Command() {
  const [difficultyMode, setDifficultyMode] = useState<string>("easy");
  const [findOutIcons, setFindOutIcons] = useState<string[]>([]);
  const [targetIcon, setTargetIcon] = useState<string>("");
  const [targetIndex, setTargetIndex] = useState<number>(-1);
  const [refreshIcon, setRefreshIcon] = useState<boolean>(false);
  const [lastRandomRow, setLastRandomRow] = useState<number>(0);
  const [isGaming, setIsGaming] = useState<boolean>(false);
  const [leftTime, setLeftTime] = useState<number>(allCountDownTime);
  const [score, setScore] = useState<number>(0);
  const [showScore, setShowScore] = useState<boolean>(false);

  const { push } = useNavigation();

  useEffect(() => {
    async function _fetchIcons() {
      if (isGaming) {
        const { targetIcon, targetIndex, randomFindOutIcons } = getRandomFindOutIcon(lastRandomRow, difficultyMode);
        setFindOutIcons(randomFindOutIcons);
        setTargetIcon(targetIcon);
        setTargetIndex(targetIndex);
      }
    }

    _fetchIcons().then();
  }, [refreshIcon]);

  useEffect(() => {
    async function _fetchHistoryScore() {
      if (isGaming) {
        const historyScore = await getHistoryScore();
        push(<ScorePage myScore={{ mode: difficultyMode, score: score }} historyScore={historyScore} />);
        await showToast(Toast.Style.Success, "Your score is " + (score + 1) + " !").then((toast) => {
          toast.hide();
        });
      }
    }

    _fetchHistoryScore().then();
  }, [showScore]);

  useEffect(() => {
    async function _() {
      if (isGaming) {
        let countDown = Number(allCountDownTime);
        const interval = setInterval(() => {
          countDown -= 1;
          setLeftTime(countDown);
          if (countDown === 0) {
            setShowScore(!showScore);
            setLeftTime(allCountDownTime);
            setIsGaming(false);
            clearInterval(interval);
          }
        }, 1000);
        setRefreshIcon(!refreshIcon);
        setScore(0);
        await showToast(Toast.Style.Animated, "Your score is 0 !");
      }
    }

    _().then();
  }, [isGaming]);

  return (
    <List
      isLoading={false}
      enableFiltering={false}
      searchBarPlaceholder="Find the different icon in 30 seconds"
      searchBarAccessory={
        <List.Dropdown
          tooltip={"Difficulty mode"}
          storeValue={true}
          onChange={(newValue) => {
            setDifficultyMode(newValue);
          }}
        >
          {isGaming ? (
            <List.Dropdown.Item key={difficultyMode} title={difficultyMode} value={difficultyMode} />
          ) : (
            modes.map((value) => {
              return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
            })
          )}
        </List.Dropdown>
      }
    >
      {!isGaming ? (
        <List.EmptyView
          title={`Press ↩︎ to start game`}
          icon={"find-out-icon.png"}
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
                title={"History Score"}
                icon={Icon.TextDocument}
                shortcut={{ modifiers: ["cmd"], key: "h" }}
                onAction={async () => {
                  const historyScore = await getHistoryScore();
                  push(<ScorePage myScore={{ mode: difficultyMode, score: score }} historyScore={historyScore} />);
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        findOutIcons.map((value, index) => (
          <List.Item
            key={"index" + index}
            icon={" "}
            title={value}
            actions={
              <ActionPanel>
                <Action
                  title={isGaming ? "Find out " + targetIcon + ". Time left: " + leftTime + "s" : "Start Game"}
                  icon={Icon.Star}
                  onAction={async () => {
                    setLastRandomRow(index);
                    if (targetIndex == index) {
                      await showToast(Toast.Style.Animated, "Your score is " + (score + 1) + " !");
                      setRefreshIcon(!refreshIcon);
                      setScore(score + 1);
                    } else {
                      await showToast(Toast.Style.Animated, "Your score is " + score + " !", "Wrong choice.");
                      setRefreshIcon(!refreshIcon);
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
