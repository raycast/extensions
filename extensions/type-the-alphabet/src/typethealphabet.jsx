import React, { useState, useEffect } from "react";
import {
  Icon,
  ActionPanel,
  Action,
  List,
  Detail,
  useNavigation,
  CopyToClipboardAction,
  LocalStorage,
} from "@raycast/api";

function Statistics({ letterTimes, totalTime, bestTime, onReset, pop }) {
  let markdown = `# Total time: ${totalTime} seconds\n\n**Best Time: ${bestTime} seconds**\n| Letter | Time |\n| --- | --- |\n`;

  for (let i = 0; i < letterTimes.length; i++) {
    const letter = String.fromCharCode(65 + i);
    const time = i === 0 ? letterTimes[i] : letterTimes[i] - letterTimes[i - 1];
    markdown += `| ${letter} | ${time.toFixed(2)}s |\n`;
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Reset"
            onAction={() => {
              onReset();
              pop();
            }}
            icon={Icon.RotateClockwise}
          />
          <Action.CopyToClipboard title="Copy Statistics" content={markdown} />
        </ActionPanel>
      }
    />
  );
}

export default function TypeAlphabet() {
  const [currentProgress, setCurrentProgress] = useState("");
  const [nextLetter, setNextLetter] = useState("A");
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [letterTimes, setLetterTimes] = useState([]);
  const [bestTime, setBestTime] = useState(null);

  const { push, pop } = useNavigation();

  useEffect(() => {
    const fetchBestTime = async () => {
      const storedBestTime = await LocalStorage.getItem("bestTime");
      if (storedBestTime) {
        setBestTime(parseFloat(storedBestTime));
      }
    };
    fetchBestTime();
  }, []);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 10);
    } else if (!isTimerRunning && timer !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  const handleKeyDown = (key) => {
    if (key.toUpperCase() === nextLetter) {
      setCurrentProgress((prevProgress) => prevProgress + key.toUpperCase());

      const newLetterTimes = [...letterTimes];
      newLetterTimes.push(timer / 100);

      if (nextLetter === "Z") {
        setIsTimerRunning(false);
        setNextLetter("Success!");
        const totalTime = timer / 100;
        if (bestTime === null || totalTime < bestTime) {
          setBestTime(totalTime);
          LocalStorage.setItem("bestTime", totalTime.toFixed(3));
        }
        setLetterTimes(newLetterTimes.map((time, i) => (i === 0 ? time : time - newLetterTimes[i - 1])));
        push(
          <Statistics
            letterTimes={newLetterTimes}
            totalTime={formatTime(timer)}
            bestTime={bestTime !== null ? bestTime.toFixed(3) : totalTime.toFixed(3)}
            onReset={handleReset}
            pop={pop}
          />
        );
      } else {
        setLetterTimes(newLetterTimes);

        if (!isTimerRunning && nextLetter === "A") {
          setIsTimerRunning(true);
        }
        setNextLetter(String.fromCharCode(nextLetter.charCodeAt() + 1));
      }
    }
  };

  const handleReset = () => {
    setCurrentProgress("");
    setNextLetter("A");
    setTimer(0);
    setIsTimerRunning(false);
    setLetterTimes([]);
  };

  const formatTime = (milliseconds) => {
    const seconds = (milliseconds / 100).toFixed(3);
    return `${seconds}`;
  };

  return (
    <List
      searchText=""
      onSearchTextChange={handleKeyDown}
      searchBarPlaceholder="Type here. Pro tip: Press enter to restart"
      actions={
        <ActionPanel>
          {(isTimerRunning || nextLetter === "Success!") && (
            <Action title="Reset" onAction={handleReset} icon={Icon.RotateClockwise} />
          )}
          {nextLetter === "Success!" && <Action.CopyToClipboard title="Copy Time" content={formatTime(timer)} />}
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Keyboard}
        title={nextLetter}
        description={`${
          currentProgress || "Typing game to see how fast you type the alphabet. Timer starts when you do :)"
        }${isTimerRunning || nextLetter === "Success!" ? `\n${formatTime(timer)} seconds` : ""}${
          bestTime !== null ? `\nBest Time: ${bestTime.toFixed(3)} seconds` : ""
        }`}
      />
    </List>
  );
}
