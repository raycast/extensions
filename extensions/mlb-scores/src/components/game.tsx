import { environment, Detail } from "@raycast/api";
import React from "react";
import FeedInterface from "../interfaces/feed";
import { resolve } from "path";

const CACHE_DIR = resolve(environment.supportPath, "cache");

type GameProps = {
  game: FeedInterface | undefined;
};
const Game = React.memo(
  (props: GameProps) => {
    const game = props.game;
    if (!game) {
      return <Detail markdown="## Loading..." />;
    }
    const linescore = game.liveData.linescore;
    const runs_inning = Array(9).fill(["X", "X"]);
    linescore.innings.forEach((inning, index) => {
      const away = inning ? inning.away.runs || 0 : "X";
      const home = !(index === linescore.currentInning && linescore.isTopInning) ? inning.home.runs || 0 : "X";
      runs_inning[index] = [away, home];
    });
    const runnerDict = game.liveData.linescore.offense;
    let runners = 0;
    ["first", "second", "third"].forEach((base, index) => {
      if (base in runnerDict) {
        runners += 1 << index;
      }
    });
    let aw = false;
    let hw = false;
    if (
      game.gameData.status.abstractGameCode.toUpperCase() === "F" &&
      linescore.teams.away.runs > linescore.teams.home.runs
    ) {
      aw = true;
    } else if (
      game.gameData.status.abstractGameCode.toUpperCase() === "F" &&
      linescore.teams.home.runs > linescore.teams.away.runs
    ) {
      hw = true;
    }
    const d = new Date(game.gameData.datetime.dateTime);
    const tzName = d.toLocaleString("en", { timeZoneName: "short" }).split(" ").pop();
    const hrs = d.getHours() % 12;
    const date_string = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
      .getDate()
      .toString()
      .padStart(2, "0")} ${hrs ? hrs : 12}:${d.getMinutes().toString().padStart(2, "0")} ${
      d.getHours() >= 12 ? "pm" : "am"
    } ${tzName}`;
    const md_string = `
# ${aw ? "*" : ""}${game.gameData.teams.away.name} (${linescore.teams.away.runs ? linescore.teams.away.runs : "0"})${
      aw ? "*" : ""
    } <img src="${
      "file://" + resolve(CACHE_DIR, `${game.gameData.teams.away.id}.svg`).replace(" ", "%20")
    }" height="20" /> @ ${hw ? "*" : ""}${game.gameData.teams.home.name} (${
      linescore.teams.home.runs ? linescore.teams.home.runs : "0"
    })${hw ? "*" : ""} <img src="${
      "file://" + resolve(CACHE_DIR, `${game.gameData.teams.home.id}.svg`).replace(" ", "%20")
    }" height="20" />

${game.gameData.status.abstractGameCode.toUpperCase() === "P" ? `Starts at: ${date_string}` : ""}

${
  game.gameData.status.abstractGameCode.toUpperCase() === "L"
    ? `${linescore.inningState} ${linescore.currentInningOrdinal}`
    : ""
}

${game.gameData.status.detailedState}

\`${"".padEnd(3)}\`  ${runs_inning.map((_, index) => `\`${(index + 1).toString().padStart(2)}\``).join(" ")}

\`${game.gameData.teams.away.abbreviation.padStart(3)}\`  ${runs_inning
      .map((inning) => `\`${inning[0].toString().padStart(2)}\``)
      .join(" ")}

\`${game.gameData.teams.home.abbreviation.padStart(3)}\`  ${runs_inning
      .map((inning) => `\`${inning[1].toString().padStart(2)}\``)
      .join(" ")}

---

\`${"".padEnd(3)}\`  ${["R", "H", "E"].map((label) => `\`${label.padStart(2)}\``).join(" ")}

\`${game.gameData.teams.away.abbreviation.padStart(3)}\`  \`${(linescore.teams.away.runs || 0)
      .toString()
      .padStart(2)}\` \`${(linescore.teams.away.hits || 0).toString().padStart(2)}\` \`${(
      linescore.teams.away.errors || 0
    )
      .toString()
      .padStart(2)}\`

\`${game.gameData.teams.home.abbreviation.padStart(3)}\`  \`${(linescore.teams.home.runs || 0)
      .toString()
      .padStart(2)}\` \`${(linescore.teams.home.hits || 0).toString().padStart(2)}\` \`${(
      linescore.teams.home.errors || 0
    )
      .toString()
      .padStart(2)}\`

${
  game.gameData.status.abstractGameCode.toUpperCase() === "L"
    ? `<img src="file://${resolve(environment.assetsPath, `${runners}.svg`).replace(" ", "%20")}" height="100" />`
    : ""
}
${
  game.gameData.status.abstractGameCode.toUpperCase() === "L"
    ? `${linescore.balls}-${linescore.strikes}, ${linescore.outs} out`
    : ""
}
    `;
    return <Detail markdown={md_string} />;
  },
  (prev, next) => prev.game === next.game
);

export default Game;
