import {
  List,
  Action,
  ActionPanel,
  Toast,
  showToast,
  popToRoot,
  showHUD,
  LocalStorage,
  Clipboard,
  Icon,
} from "@raycast/api";
import svg64 from "svg64";
import { useState, useRef } from "react";
import wordlist from "./wordlist/all.js";
import allowedList from "./wordlist/allowed.js";
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
  let [selectedTab, setSelectedTab] = useState("");
  let [stats, setStats] = useState({
    daily: {
      played: 0,
      won: 0,
      guessDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
      },
    },
    unlimited: {
      played: 0,
      won: 0,
      guessDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
      },
    },
  });

  let [guess, setGuess] = useState("");

  let guessDaily = useRef("");
  let guessUnlimited = useRef("");

  let [board, setBoard] = useState(
    Array(6)
      .fill()
      .map(() =>
        Array(5)
          .fill()
          .map(() => ({
            letter: "",
            color: Color.GRAY,
          })),
      ),
  );
  let guessCount = useRef(0);
  let target = useRef("     ");
  let hasGuessed = useRef(false);

  let [unlimitedBoard, setUnlimitedBoard] = useState(
    Array(6)
      .fill()
      .map(() =>
        Array(5)
          .fill()
          .map(() => ({
            letter: "",
            color: Color.GRAY,
          })),
      ),
  );
  let unlimitedGuessCount = useRef(0);
  let unlimitedTarget = useRef(allowedList[Math.floor(Math.random() * allowedList.length)]);
  let unlimitedHasGuessed = useRef(false);

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

        let storeUnlimitedBoard = await LocalStorage.getItem("wordleUnlimitedBoard");
        let storeUnlimitedGuessCount = await LocalStorage.getItem("wordleUnlimitedGuessCount");
        let storeUnlimitedHasGuessed = await LocalStorage.getItem("wordleUnlimitedHasGuessed");

        let storeStats = await LocalStorage.getItem("wordleStats");

        if (storeStats !== undefined) {
          setStats(JSON.parse(storeStats));
        }

        if (storeUnlimitedBoard && storeGuessCount !== undefined && storeHasGuessed !== undefined) {
          setUnlimitedBoard(JSON.parse(storeUnlimitedBoard));
          unlimitedGuessCount.current = JSON.parse(storeUnlimitedGuessCount);
          unlimitedHasGuessed.current = JSON.parse(storeUnlimitedHasGuessed);
        }

        if (storeBoard && storeGuessCount !== undefined && storeHasGuessed !== undefined) {
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
              style: Toast.Style.Success,
              title: "Daily Word Completed!",
              message: "Try out Wordle Unlimited.",
            });
            return;
          }

          if (guessCount.current === 6) {
            target.current = data.solution;
            setLoading(false);
            showToast({
              style: Toast.Style.Failure,
              title: "Already Completed.",
              message: "You were not able to guess the word in 6 attempts.",
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
                    })),
                ),
            ),
          );
          await LocalStorage.setItem("wordleGuessCount", JSON.stringify(0));
          await LocalStorage.setItem("wordleHasGuessed", JSON.stringify(false));
        })();
      }
      await LocalStorage.setItem("wordleDate", currentDate);

      target.current = data.solution;
      if (!hasGuessed.current) {
        showToast({
          style: Toast.Style.SuccessMessage,
          title: "Loaded daily word",
        });
      }
      setLoading(false);
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
      if (selectedTab === "daily") {
        guessDaily.current = text;
        setGuess(text);
      } else if (selectedTab === "unlimited") {
        guessUnlimited.current = text;
        setGuess(text);
      }
    }
  };

  let submit = () => {
    if (selectedTab === "daily" ? hasGuessed.current : unlimitedHasGuessed.current) {
      showToast({
        title: "You have already guessed the word!",
      });
      return;
    }
    if (!loading) {
      let parsedGuess = guess.toLowerCase();
      if (guess.length === 5 && wordlist.includes(parsedGuess)) {
        let targetLetterCount = {};
        for (const letter of selectedTab === "unlimited" ? unlimitedTarget.current : target.current) {
          targetLetterCount[letter] = (targetLetterCount[letter] || 0) + 1;
        }

        let row = [];
        let correct = 0;
        for (let i = 0; i < parsedGuess.length; i++) {
          const guessedLetter = parsedGuess[i];
          let targetLetter = target.current[i];
          if (selectedTab === "unlimited") targetLetter = unlimitedTarget.current[i];

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
        if (selectedTab === "unlimited") {
          unlimitedGuessCount.current++;
          setUnlimitedBoard((prevBoard) => {
            let newBoard = structuredClone(prevBoard);
            for (let i in prevBoard) {
              if (prevBoard[i][0].letter === "") {
                newBoard[i] = row;
                break;
              }
            }

            if (correct === 5) {
              setStats((oldStats) => {
                let newStats = structuredClone(oldStats);
                newStats.unlimited.played++;
                newStats.unlimited.won++;
                newStats.unlimited.guessDistribution[unlimitedGuessCount.current]++;
                (async () => {
                  await LocalStorage.setItem("wordleStats", JSON.stringify(newStats));
                })();
                return newStats;
              });
              unlimitedHasGuessed.current = true;
              let message;

              switch (unlimitedGuessCount.current) {
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
              await LocalStorage.setItem("wordleUnlimitedBoard", JSON.stringify(newBoard));
              await LocalStorage.setItem("wordleUnlimitedGuessCount", JSON.stringify(unlimitedGuessCount.current));
              await LocalStorage.setItem("wordleUnlimitedHasGuessed", JSON.stringify(unlimitedHasGuessed.current));
            })();

            if (unlimitedGuessCount.current === 6 && correct !== 5) {
              setStats((oldStats) => {
                let newStats = structuredClone(oldStats);
                newStats.unlimited.played++;
                (async () => {
                  await LocalStorage.setItem("wordleStats", JSON.stringify(newStats));
                })();
                return newStats;
              });
              showToast({
                style: Toast.Style.Failure,
                title: `The word was "${unlimitedTarget.current.toLocaleUpperCase()}"`,
              });
            }

            return newBoard;
          });
        } else {
          guessCount.current++;
          setBoard((prevBoard) => {
            let newBoard = structuredClone(prevBoard);
            for (let i in prevBoard) {
              if (prevBoard[i][0].letter === "") {
                newBoard[i] = row;
                break;
              }
            }

            if (correct === 5) {
              setStats((oldStats) => {
                let newStats = structuredClone(oldStats);
                newStats.daily.played++;
                newStats.daily.won++;
                newStats.daily.guessDistribution[guessCount.current]++;
                (async () => {
                  await LocalStorage.setItem("wordleStats", JSON.stringify(newStats));
                })();
                return newStats;
              });
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
              setStats((oldStats) => {
                let newStats = structuredClone(oldStats);
                newStats.daily.played++;
                (async () => {
                  await LocalStorage.setItem("wordleStats", JSON.stringify(newStats));
                })();
                return newStats;
              });
              showToast({
                style: Toast.Style.Failure,
                title: `The word was "${target.current.toLocaleUpperCase()}"`,
              });
            }

            return newBoard;
          });
        }
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
            })),
        );

    let markdown = "";
    for (let row of board) {
      markdown += generateRow(row) + "\n";
    }
    return markdown;
  };

  const share = () => {
    let result = [`Wordle ${launchDays.current} ${!hasGuessed.current ? "X" : guessCount.current}/6\n`];
    if (selectedTab === "unlimited")
      result = [`Wordle Unlimited ${!unlimitedHasGuessed.current ? "X" : unlimitedGuessCount.current}/6\n`];
    for (let row of selectedTab === "unlimited" ? unlimitedBoard : board) {
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

  const giveUp = () => {
    guessUnlimited.current = "";
    showToast({
      style: Toast.Style.Failure,
      title: `The word was "${unlimitedTarget.current.toLocaleUpperCase()}"`,
    });
    setStats((oldStats) => {
      let newStats = structuredClone(oldStats);
      newStats.unlimited.played++;
      (async () => {
        await LocalStorage.setItem("wordleStats", JSON.stringify(newStats));
      })();
      return newStats;
    });
    replay();
  };

  const replay = () => {
    setUnlimitedBoard(
      Array(6)
        .fill()
        .map(() =>
          Array(5)
            .fill()
            .map(() => ({
              letter: "",
              color: Color.GRAY,
            })),
        ),
    );
    unlimitedGuessCount.current = 0;
    unlimitedTarget.current = allowedList[Math.floor(Math.random() * allowedList.length)];
    unlimitedHasGuessed.current = false;
    (async () => {
      await LocalStorage.setItem(
        "wordleUnlimitedBoard",
        JSON.stringify(
          Array(6)
            .fill()
            .map(() =>
              Array(5)
                .fill()
                .map(() => ({
                  letter: "",
                  color: Color.GRAY,
                })),
            ),
        ),
      );
      await LocalStorage.setItem("wordleUnlimitedGuessCount", JSON.stringify(unlimitedGuessCount.current));
      await LocalStorage.setItem("wordleUnlimitedHasGuessed", JSON.stringify(unlimitedHasGuessed.current));
    })();
  };

  const generateStatistics = () => {
    let generateDistribution = (distribution) => {
      function convertToPercentages(obj) {
        const values = Object.values(obj);
        const maxValue = Math.max(...values);

        const result = {};
        for (const key in obj) {
          result[key] = obj[key] / maxValue;
        }

        return result;
      }

      let percents = convertToPercentages(distribution);

      let svg = `
      <svg width="500" height="248">
    <rect width="500" height="248" fill="#00000000" />
    <text x="15" y="33" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="black"
        font-family="Helvetica Neue">1</text>
    <rect x="40" y="8" width="${30 + percents[1] * 400}" height="30" fill="#787C7E" />
    <text x="49" y="33" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="white"
        font-family="Helvetica Neue">${distribution["1"]}</text>

    <text x="15" y="73" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="black"
        font-family="Helvetica Neue">2</text>
    <rect x="40" y="48" width="${30 + percents[2] * 400}" height="30" fill="#787C7E" />
    <text x="49" y="73" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="white"
        font-family="Helvetica Neue">${distribution["2"]}</text>

    <text x="15" y="113" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="black"
        font-family="Helvetica Neue">3</text>
    <rect x="40" y="88" width="${30 + percents[3] * 400}" height="30" fill="#787C7E" />
    <text x="49" y="113" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="white"
        font-family="Helvetica Neue">${distribution["3"]}</text>

    <text x="15" y="153" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="black"
        font-family="Helvetica Neue">4</text>
    <rect x="40" y="128" width="${30 + percents[4] * 400}" height="30" fill="#787C7E" />
    <text x="49" y="153" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="white"
        font-family="Helvetica Neue">${distribution["4"]}</text>


    <text x="15" y="193" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="black"
        font-family="Helvetica Neue">5</text>
    <rect x="40" y="168" width="${30 + percents[5] * 400}" height="30" fill="#787C7E" />
    <text x="49" y="193" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="white"
        font-family="Helvetica Neue">${distribution["5"]}</text>

    <text x="15" y="233" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="black"
        font-family="Helvetica Neue">6</text>
    <rect x="40" y="208" width="${30 + percents[6] * 400}" height="30" fill="#787C7E" />
    <text x="49" y="233" alignment-baseline="middle" class="large" font-size="20" font-weight="bold"
        fill="white"
        font-family="Helvetica Neue">${distribution["6"]}</text>
</svg>
      `;

      return `![](${svg64(svg)})`;
    };

    return `
# Wordle Statistics

## Daily Games

${
  stats.daily.played === 0
    ? "Play a Daily game to unlock Daily Wordle Statistics"
    : `
### Statistics
| Played  | Games Won | Games Lost | Win % |
|---------|-----------|------------|-------|
| ${stats.daily.played} |  ${stats.daily.won}  | ${stats.daily.played - stats.daily.won}      | ${Math.round(
        (stats.daily.won / stats.daily.played) * 100,
      )}% |

### Guess Distribution

${generateDistribution(stats.daily.guessDistribution)}
`
}

## Unlimited Games
${
  stats.unlimited.played === 0
    ? "Play an Unlimited game to unlock Unlimited Wordle Statistics"
    : `

### Statistics

| Played  | Games Won | Games Lost | Win % |
|---------|-----------|------------|-------|
| ${stats.unlimited.played} |  ${stats.unlimited.won}  | ${
        stats.unlimited.played - stats.unlimited.won
      }      | ${Math.round((stats.unlimited.won / stats.unlimited.played) * 100)}% |

### Guess Distribution

${generateDistribution(stats.unlimited.guessDistribution)}
`
}


    `;
  };

  return (
    <List
      isShowingDetail={true}
      onSearchTextChange={updateSearchBar}
      searchText={guess}
      searchBarPlaceholder={
        selectedTab === "stats" ? "You cannot guess on the Statistics tab" : "Enter your guess here..."
      }
      selectedItemId={selectedTab}
      onSelectionChange={(tab) => {
        if (tab === "daily") {
          setGuess(guessDaily.current);
        }
        if (tab === "unlimited") {
          setGuess(guessUnlimited.current);
        }
        if (tab === "stats") {
          setGuess("");
        }
        setSelectedTab(tab);
      }}
    >
      <List.Item
        title={dailyWordleTitle}
        icon={Icon.Calendar}
        id="daily"
        detail={<List.Item.Detail markdown={generateBoard(board)} />}
        actions={
          <ActionPanel>
            {guessCount.current === 6 || hasGuessed.current ? (
              <Action icon={Icon.Clipboard} title="Share" onAction={share} />
            ) : (
              <Action icon={Icon.QuestionMark} title="Submit Guess" onAction={submit} />
            )}
          </ActionPanel>
        }
      />

      <List.Item
        title={"Wordle Unlimited"}
        icon={Icon.Repeat}
        id="unlimited"
        detail={<List.Item.Detail markdown={generateBoard(unlimitedBoard)} />}
        actions={
          <ActionPanel>
            {unlimitedGuessCount.current === 6 || unlimitedHasGuessed.current ? (
              <>
                <Action icon={Icon.RotateClockwise} title="Replay" onAction={replay} />
                <Action icon={Icon.Clipboard} title="Share" onAction={share} />
              </>
            ) : (
              <>
                <Action icon={Icon.QuestionMark} title="Submit Guess" onAction={submit} />
                <Action icon={Icon.XMarkCircle} title="Give Up" onAction={giveUp} />
              </>
            )}
          </ActionPanel>
        }
      />

      <List.Item
        title={"Wordle Statistics"}
        icon={Icon.BarChart}
        id="stats"
        detail={<List.Item.Detail markdown={generateStatistics()} />}
      />
    </List>
  );
}
