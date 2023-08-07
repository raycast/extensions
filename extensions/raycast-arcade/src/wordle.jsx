import { List, Action, ActionPanel, Toast, showToast, popToRoot, showHUD, LocalStorage, Clipboard } from "@raycast/api";
import svg64 from "svg64";
import { useState, useRef } from "react";
import wordlist from "./wordlist/all.js";
import { useFetch } from "@raycast/utils";

let Color = {
  GRAY: "#787C7E",
  YELLOW: "#CAB458",
  GREEN: "#6BAA64",
};

function generateRow(rows) {
  let spacing = 25;
  let width = 500;
  let svgString = `
    <svg viewBox="0 0 ${width * 5 + spacing * 4} ${width}" xmlns="http://www.w3.org/2000/svg">
    `;

  for (let [i, { letter, color }] of Object.entries(rows)) {
    if (letter === "") {
      svgString += `
            <rect x="${width * i + spacing * i}" width="${width}" height="${width}" fill="#D4D6DA7F"/>
            `;
    } else {
      svgString += `
            <rect x="${width * i + spacing * i}" width="${width}" height="${width}" fill="${color}"/>
            <text x="${width * i + spacing * i + width / 2}" y="${
        width - width / 6
      }" text-anchor="middle" alignment-baseline="middle" class="large" font-size="300" font-weight="bold" fill="white" font-family="Helvetica Neue">${letter}</text>
            `;
    }
  }
  svgString += `<rect width="4000" height="${width}" fill="#00000000"/></svg>`;
  return `![](${svg64(svgString)})`;
}

export default function Wordle() {
  let [guess, setGuess] = useState("");
  let [board, setBoard] = useState(
    Array(6)
      .fill()
      .map(() =>
        Array(5)
          .fill()
          .map(() => ({
            letter: "",
            color: Color.GRAY,
          }))
      )
  );
  let guessCount = useRef(0);
  let target = useRef("     ");
  let hasGuessed = useRef(false);
  let [loading, setLoading] = useState(true);
  let [dailyWordleTitle, setDailyWordleTitle] = useState("Daily Wordle");
  let currentDate = new Date().toISOString().split("T")[0];
  let launchDays = useRef("");
  let previousTime = useRef();

  const updateDailyWordleTitle = () => {
    if (!hasGuessed.current) {
      setDailyWordleTitle("Daily Wordle");
    } else {
      const currentTime = new Date();
      const targetMidnight = new Date().setHours(24, 0, 0, 0);

      const timeRemaining = targetMidnight - currentTime;

      const hours = Math.floor(timeRemaining / (1000 * 60 * 60));

      const remainingTime = hours >= 1 ? `${hours}h` : "< 1h";

      if (remainingTime !== previousTime.current) {
        setDailyWordleTitle(`Daily Wordle (Next in ${remainingTime})`);
        previousTime.current = remainingTime;
      }
    }
  };

  useFetch(`https://www.nytimes.com/svc/wordle/v2/${currentDate}.json`, {
    onData: async (data) => {
      launchDays.current = data.days_since_launch;

      let storeDate = await LocalStorage.getItem("wordleDate");
      if (storeDate === currentDate) {
        let storeBoard = await LocalStorage.getItem("wordleBoard");
        let storeGuessCount = await LocalStorage.getItem("wordleGuessCount");
        let storeHasGuessed = await LocalStorage.getItem("wordleHasGuessed");
        if (storeBoard && storeGuessCount && storeHasGuessed) {
          setBoard(JSON.parse(storeBoard));
          guessCount.current = JSON.parse(storeGuessCount);
          hasGuessed.current = JSON.parse(storeHasGuessed);

          // Trigger immediately
          updateDailyWordleTitle();

          // Repeat every 60 seconds
          setInterval(updateDailyWordleTitle, 60000);

          updateDailyWordleTitle();
          setInterval(() => {
            updateDailyWordleTitle();
          }, 60000);

          if (hasGuessed.current) {
            target.current = data.solution;
            setLoading(false);
            showToast({
              style: Toast.Style.SuccessMessage,
              title: "Congratulations!",
              message: "You have already guessed the word.",
            });
            return;
          }
        }
      } else {
        (async () => {
          await LocalStorage.setItem(
            "wordleBoard",
            JSON.stringify(
              Array(6)
                .fill()
                .map(() =>
                  Array(5)
                    .fill()
                    .map(() => ({
                      letter: "",
                      color: Color.GRAY,
                    }))
                )
            )
          );
          await LocalStorage.setItem("wordleGuessCount", JSON.stringify(0));
          await LocalStorage.setItem("wordleHasGuessed", JSON.stringify(false));
        })();
      }
      await LocalStorage.setItem("wordleDate", currentDate);

      target.current = data.solution;
      setLoading(false);
      showToast({
        style: Toast.Style.SuccessMessage,
        title: "Loaded daily word",
      });
    },
    onWillExecute: () => {
      showToast({
        style: Toast.Style.Animated,
        title: "Loading daily word...",
      });
    },
    onError: () => {
      popToRoot();
      showHUD("Failed to load daily Wordle");
    },
  });

  let updateSearchBar = (text) => {
    if (text.length <= 5 && text.match(/^[a-zA-Z]*$/)) {
      setGuess(text);
    }
  };

  let submit = () => {
    if (hasGuessed.current) {
      showToast({
        title: "You have already guessed the word!",
      });
      return;
    }
    if (!loading) {
      let parsedGuess = guess.toLowerCase();
      if (guess.length === 5 && wordlist.includes(parsedGuess)) {
        guessCount.current++;
        let targetLetterCount = {};
        for (const letter of target.current) {
          targetLetterCount[letter] = (targetLetterCount[letter] || 0) + 1;
        }

        let row = [];
        let correct = 0;
        for (let i = 0; i < parsedGuess.length; i++) {
          const guessedLetter = parsedGuess[i];
          const targetLetter = target.current[i];

          if (guessedLetter === targetLetter) {
            row.push({
              letter: guessedLetter.toLocaleUpperCase(),
              color: Color.GREEN,
            });
            correct++;
            targetLetterCount[guessedLetter]--;
          } else if (targetLetterCount[guessedLetter] > 0) {
            row.push({
              letter: guessedLetter.toLocaleUpperCase(),
              color: Color.YELLOW,
            });
            targetLetterCount[guessedLetter]--;
          } else {
            row.push({
              letter: guessedLetter.toLocaleUpperCase(),
              color: Color.GRAY,
            });
          }
        }
        setBoard((prevBoard) => {
          let newBoard = structuredClone(prevBoard);
          for (let i in prevBoard) {
            if (prevBoard[i][0].letter === "") {
              newBoard[i] = row;
              break;
            }
          }

          if (correct === 5) {
            hasGuessed.current = true;
            let message;
            updateDailyWordleTitle();

            switch (guessCount.current) {
              case 1:
                message = "Genius";
                break;
              case 2:
                message = "Magnificent";
                break;
              case 3:
                message = "Impressive";
                break;
              case 4:
                message = "Splendid";
                break;
              case 5:
                message = "Great";
                break;
              case 6:
                message = "Phew";
                break;
              default:
                message = "Good Job";
            }
            showToast({
              style: Toast.Style.Success,
              title: message,
            });
          }

          (async () => {
            await LocalStorage.setItem("wordleBoard", JSON.stringify(newBoard));
            await LocalStorage.setItem("wordleGuessCount", JSON.stringify(guessCount.current));
            await LocalStorage.setItem("wordleHasGuessed", JSON.stringify(hasGuessed.current));
          })();

          if (guessCount.current === 6 && correct !== 5) {
            showToast({
              style: Toast.Style.Failure,
              title: `The word was "${target.current.toLocaleUpperCase()}"`,
            });
          }

          return newBoard;
        });
        setGuess("");
      } else {
        if (guess.length < 5) {
          showToast({
            style: Toast.Style.Failure,
            title: `Too short.`,
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: `"${guess}" is not a valid word.`,
          });
        }
      }
    }
  };

  const generateBoard = (board) => {
    if (loading)
      board = Array(6)
        .fill()
        .map(() =>
          Array(5)
            .fill()
            .map(() => ({
              letter: "",
              color: Color.GRAY,
            }))
        );

    let markdown = "";
    for (let row of board) {
      markdown += generateRow(row) + "\n";
    }
    return markdown;
  };

  const share = () => {
    let result = [`Wordle ${launchDays.current} ${!hasGuessed.current ? "X" : guessCount.current}/6\n`];
    for (let row of board) {
      if (row[0].letter === "") break;
      let rowExport = "";
      for (let cell of row) {
        switch (cell.color) {
          case Color.GRAY:
            rowExport += "⬜";
            break;
          case Color.GREEN:
            rowExport += "🟩";
            break;
          case Color.YELLOW:
            rowExport += "🟨";
            break;
        }
      }
      result.push(rowExport);
    }
    Clipboard.copy(result.join("\n"));
    showToast({
      style: Toast.Style.Success,
      title: "Copied results to clipboard",
    });
  };

  return (
    <List isShowingDetail={true} onSearchTextChange={updateSearchBar} searchText={guess}>
      <List.Item
        title={dailyWordleTitle}
        detail={<List.Item.Detail markdown={generateBoard(board)} />}
        actions={
          <ActionPanel>
            {guessCount.current === 6 || hasGuessed.current ? (
              <Action title="Share" onAction={share} />
            ) : (
              <Action title="Submit Guess" onAction={submit} />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
