import React, { useState, useEffect } from "react";
import { Icon, ActionPanel, Action, List } from "@raycast/api";

export default function TypeAlphabet() {
  const [currentProgress, setCurrentProgress] = useState<string>("");
  const [nextLetter, setNextLetter] = useState<string>("A");
  const [timer, setTimer] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 10);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isTimerRunning]);

  const handleKeyDown = (key: string) => {
    if (key.toUpperCase() === nextLetter) {
      setCurrentProgress((prevProgress) => prevProgress + key.toUpperCase());

      if (nextLetter === "Z") {
        setIsTimerRunning(false);
        setNextLetter("Success!");
      } else {
        if (!isTimerRunning && nextLetter === "A") {
          setIsTimerRunning(true);
        }
        setNextLetter(
          String.fromCharCode(nextLetter.charCodeAt(0) + 1)
        );
      }
    }
  };

  const handleReset = () => {
    setCurrentProgress("");
    setNextLetter("A");
    setTimer(0);
    setIsTimerRunning(false);
  };

  const formatTime = (milliseconds: number) => {
    const seconds = (milliseconds / 100).toFixed(3);
    return `${seconds}s`;
  };

  return (
    <List
      searchText=""
      onSearchTextChange={handleKeyDown}
      searchBarPlaceholder="Type here. Pro tip: Press enter to restart"
      actions={
        <ActionPanel>
          <Action title="Reset" onAction={handleReset} />
          <Action.CopyToClipboard title="Copy Time" content={formatTime(timer)} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Keyboard}
        title={nextLetter}
        description={`${
          currentProgress ||
          "Typing game to see how fast you type the alphabet. Timer starts when you do :)"
        }\nTime: ${formatTime(timer)}`}
      />
    </List>
  );
}
