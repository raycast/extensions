import { Action, ActionPanel, environment, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import fs, { PathLike } from "fs";
import fetch from "node-fetch";
import { resolve } from "path";
import { useEffect, useRef, useState } from "react";
import Game from "./components/game";
import FeedInterface from "./interfaces/feed";
import ScheduleInterface from "./interfaces/schedule";
import Teams from "./interfaces/teams";
import getEndpoint from "./lib/endpoints";
import useGameDataStore from "./lib/store";

const CACHE_DIR = resolve(environment.supportPath, "cache");

export default function main() {
  const isFirst = useRef(true);
  const { data, setData } = useGameDataStore();
  const [reloading, setReloading] = useState(true);
  const [reloadData, setReloadData] = useState(false);
  const { data: scheduleData } = useFetch<ScheduleInterface>(
    getEndpoint("schedule", {}) + new URLSearchParams({ sportId: "1" })
  );
  const [intervalCode, setIntervalCode] = useState<NodeJS.Timeout>();
  let games: Array<[boolean, FeedInterface | undefined]>;
  // const downloadGames = () => {
  // Code to load and reload games
  useEffect(() => {
    if (scheduleData === undefined) {
      return;
    }
    const gamePks = scheduleData?.dates[0] ? scheduleData?.dates[0].games.map((game) => game.gamePk) : [];
    Promise.all(
      gamePks.map(async (gamePk) => {
        let gameData: FeedInterface | Error | undefined = await fetch(getEndpoint("game", { gamePk: gamePk })).then(
          async (res) => {
            if (res.ok) {
              return (await res.json()) as FeedInterface;
            }
            return Error();
          }
        );
        let isLoading = false;
        let error: Error | undefined = undefined;
        if (gameData instanceof Error) {
          isLoading = false;
          error = gameData;
          gameData = undefined;
        }
        return [isLoading, gameData];
      })
    ).then((allGames) => {
      games = allGames as Array<[boolean, FeedInterface | undefined]>;
      setData(games.sort(sortFunc));
    });
    setReloadData(false);
  }, [scheduleData, reloadData]);

  // Every time data changes, recompute the setInterval
  useEffect(() => {
    // Default time interval for refresh in ms (15 seconds by default)
    let time_interval = 15_000;
    const game_codes: string[] = [];
    data?.map((game) => {
      if (game[1] !== undefined) {
        game_codes.push(game[1].gameData.status.abstractGameCode);
      }
    });
    // If no games are ongoing (ie all games are either final (F) or preview (not started) (P)), 10 minute delay
    // This should also apply if there are no games
    if (game_codes.every((val, _, __) => val === "F" || val === "P")) time_interval = 10 * 60 * 1_000;

    // Clear the previous setInterval
    if (typeof intervalCode !== "undefined") clearInterval(intervalCode);

    setIntervalCode(
      setInterval(() => {
        setReloadData(true);
      }, time_interval)
    );
  }, [data]);

  useEffect(() => {
    // downloadGames()
    isFirst.current = false;
  }, []);
  useEffect(() => {
    async function f() {
      if (!(await checkFileExists(CACHE_DIR))) {
        await fs.promises.mkdir(CACHE_DIR, { recursive: true });
      }
      let last_cached: number | Buffer = 0;
      if (await checkFileExists(resolve(CACHE_DIR, "cached"))) {
        last_cached = await fs.promises.readFile(resolve(CACHE_DIR, "cached"));
      }
      let recache = true;
      if (!isNaN(parseInt(last_cached.toString()))) {
        if (Date.now() - parseInt(last_cached.toString()) < 1000 * 60 * 60 * 24 * 14) {
          recache = false;
        }
      }
      if (recache) {
        await showToast(Toast.Style.Animated, "Fetching Team Logos...");
        await cache_teams();
      }
    }
    if (reloading) {
      f();
      setReloading(false);
    }
  }, [reloading]);

  if (data === undefined) {
    return <List isLoading={true} />;
  }
  return (
    <List isLoading={data === undefined}>
      {data.map((item, index) => {
        if (item[1] == undefined) {
          return <List.Item key={index} title="Loading..." />;
        }

        const title = `${item[1].gameData.teams.away.abbreviation} @ ${item[1].gameData.teams.home.abbreviation}`;
        let subtitle = item[1].gameData.status.detailedState;
        if (typeof item[1].liveData.linescore.teams.away.runs !== "undefined") {
          subtitle = `${item[1].liveData.linescore.teams.away.runs}-${item[1].liveData.linescore.teams.home.runs}, ${item[1].gameData.status.detailedState}`;
        }
        // If game hasn't started yet
        if (item[1].gameData.status.abstractGameCode.toUpperCase() === "P") {
          const d = new Date(item[1].gameData.datetime.dateTime);
          const tzName = d.toLocaleString("en", { timeZoneName: "short" }).split(" ").pop();
          const hrs = d.getHours() % 12;
          const date_string = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
            .getDate()
            .toString()
            .padStart(2, "0")} ${hrs ? hrs : 12}:${d.getMinutes().toString().padStart(2, "0")} ${
            d.getHours() >= 12 ? "pm" : "am"
          } ${tzName}`;
          subtitle = `${date_string}, ${item[1].gameData.status.detailedState}`;
        }

        return (
          <List.Item
            key={item[1].gamePk}
            title={title}
            subtitle={subtitle}
            accessories={[
              {
                // Latest play, if available
                text:
                  item[1].gameData.status.abstractGameCode === "L" || item[1].gameData.status.abstractGameCode === "P"
                    ? item[1].liveData.plays?.currentPlay?.result.description
                    : "",
              },
              {
                // Inning indicator
                text:
                  item[1].gameData.status.abstractGameCode === "F" || item[1].gameData.status.abstractGameCode === "P"
                    ? ""
                    : `${item[1].liveData.linescore.inningState === "Top" ? "▲" : "▼"} ${
                        item[1].liveData.linescore.currentInningOrdinal
                      }`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Actions">
                  <Action.Push title="Show Game" target={<Game index={index} />} />
                  <Action.OpenInBrowser title="Open in MLB" url={`https://www.mlb.com/gameday/${item[1].gamePk}`} />
                  <Action
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    title="Reload"
                    onAction={() => {
                      setReloading(true);
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

async function cache_teams() {
  const n_tries = 5;
  let teams: string | Teams = "Something went wrong";
  for (let i = 0; i < n_tries; ++i) {
    teams = await fetch("https://statsapi.mlb.com/api/v1/teams?sportId=1").then(async (res) => {
      if (res.ok) {
        i = n_tries;
        return (await res.json()) as Teams;
      }
      return await res.text();
    });
  }
  if (typeof teams === "string") {
    showToast({ style: Toast.Style.Failure, title: "Error fetching teams", message: teams });
    return;
  }
  try {
    fs.promises.writeFile(resolve(CACHE_DIR, "teams.json"), JSON.stringify(teams));
  } catch (err) {
    showToast({ style: Toast.Style.Failure, title: "Error caching teams", message: "Error saving teams to cache." });
    return;
  }

  await Promise.all(
    teams.teams.map(async (team) => {
      return fetch(getEndpoint("logo", { teamId: team.id })).then(async (res) => {
        if (res.ok) {
          return fs.promises.writeFile(resolve(CACHE_DIR, `${team.id}.svg`), await res.text());
        }
      });
    })
  );
  showToast({
    style: Toast.Style.Success,
    title: "Successfully cached teams!",
    message: "Saved teams and logos to cache.",
  });
  await fs.promises.writeFile(resolve(CACHE_DIR, "cached"), Date.now().toString());
}

async function checkFileExists(file: PathLike) {
  return await fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

const sortFunc = (a: [boolean, FeedInterface | undefined], b: [boolean, FeedInterface | undefined]) => {
  if (a[1] && b[1]) {
    switch (a[1].gameData.status.abstractGameCode + " " + b[1].gameData.status.abstractGameCode) {
      // P for preview, F for final, L for live
      // L < P < F (live < preview < final)
      case "P L": {
        return 1;
      }
      case "P F": {
        return -1;
      }
      case "F L": {
        return 1;
      }
      case "L F": {
        return -1;
      }
      case "L P": {
        return -1;
      }
      case "F P": {
        return 1;
      }
    }
  }
  return 0;
};
