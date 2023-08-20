import { List, Icon, Toast, showToast, Detail } from "@raycast/api";
import { useState, useRef } from "react";
import words from "./words.js";

export default function TypingTest() {
  let ResultView = () => {
    let secondsPassed = statistics.elapsedTime / 1000,
      minutesPassed = secondsPassed / 60,
      characters = statistics.characters,
      wpm = characters / 5 / minutesPassed;
    if (isNaN(wpm) || wpm === Infinity) wpm = 0;

    let message = "";
    if (wpm < 40) {
      message = "Test completed.";
    } else if (wpm >= 40 && wpm < 50) {
      message = " Nice! You have an average WPM.";
    } else if (wpm >= 50 && wpm < 60) {
      message = "Your WPM is above average.";
    } else if (wpm >= 60 && wpm < 70) {
      message = "Your WPM is the speed required for most jobs.";
    } else if (wpm >= 70 && wpm < 80) {
      message = "Your WPM way above average.";
    } else if (wpm >= 80 && wpm < 90) {
      message = "That's really fast!";
    } else if (wpm >= 90 && wpm < 100) {
      message = "Almost to 100+ WPM...";
    } else if (wpm >= 100) {
      message = "You are in the top 1% of typists!";
    }

    return (
      <Detail
        markdown={`
# WPM: ${Math.round(wpm)}

${message}

## Result Breakdown

| Time Typed | Characters Typed | ~ Words Typed | ~ WPM |
|------------|------------------|-------------|-----|
| ${Math.round(secondsPassed)}s | ${characters} | ${Math.round(characters / 5)} | ${Math.round(wpm)} |`}
      />
    );
  };

  const prompt = useRef(
    (() => {
      const chosen = [];
      let currentPool = structuredClone(words);

      for (let i = 0; i < 30; i++) {
        let chosenIdx = Math.floor(Math.random() * currentPool.length);

        chosen.push(currentPool[chosenIdx]);

        currentPool = structuredClone(words);
        currentPool.splice(chosenIdx, 1);
      }

      return chosen.join(" ").split("");
    })()
  );

  const cursor = useRef(0);

  const textWindow = 45;
  const [textbox, setTextbox] = useState(() => "|" + prompt.current.slice(0, textWindow).join(""));
  const [searchText, setSearchText] = useState("");

  const VIEW = {
    Result: "result",
    Test: "test",
  };

  const [currentView, setCurrentView] = useState(VIEW.Test);

  let [statistics, setStatistics] = useState({
    startTime: 0,
    endTime: 0,
    elapsedTime: 0,
    characters: 0,
  });

  let timer = useRef(null);

  return currentView === VIEW.Test ? (
    <List
      searchText={searchText}
      onSearchTextChange={(e) => {
        let addition = e.slice(-1);

        if (addition !== "") {
          if (timer.current === null) {
            setStatistics((x) => ({
              ...x,
              startTime: new Date(),
            }));
            timer.current = setInterval(() => {
              setStatistics((x) => ({
                ...x,
                elapsedTime: new Date() - x.startTime,
              }));
            }, 500);
          }

          if (addition === prompt.current[cursor.current]) {
            setStatistics((x) => ({
              ...x,
              characters: cursor.current,
            }));
            cursor.current++;

            let joined =
              prompt.current.slice(0, cursor.current).join("") + "|" + prompt.current.slice(cursor.current).join("");

            let getWindow = (text, index, windowLength) => {
              let start = Math.max(0, index - Math.floor(windowLength / 2));
              let end = Math.min([...text].length, start + windowLength);
              start = Math.max(0, end - windowLength);
              return [...text].slice(start, end).join("");
            };

            setTextbox(getWindow(joined, cursor.current, textWindow));
            setSearchText(prompt.current.slice(0, cursor.current).join(""));

            if (cursor.current === prompt.current.length) {
              setCurrentView(VIEW.Result);
              clearInterval(timer.current);
            }
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: `The next character is "${prompt.current[cursor.current]}"`,
            });
          }
        }
      }}
    >
      <List.EmptyView
        icon={Icon.Keyboard}
        title={textbox}
        description={(() => {
          let secondsPassed = statistics.elapsedTime / 1000,
            minutesPassed = secondsPassed / 60,
            characters = statistics.characters,
            wpm = characters / 5 / minutesPassed;
          if (isNaN(wpm) || wpm === Infinity) wpm = 0;

          return `${Math.round(wpm)} WPM | ${String(
            Math.round(secondsPassed)
          )}s Elapsed | ${characters} Characters Typed`;
        })()}
      />
    </List>
  ) : (
    <ResultView />
  );
}
