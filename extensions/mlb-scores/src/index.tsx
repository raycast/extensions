import { List, environment, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import FeedInterface from "./interfaces/feed";
import { URLSearchParams } from "url";
import fetch from "node-fetch";
import getEndpoint from "./lib/endpoints";
import ScheduleInterface from "./interfaces/schedule";
import { useEffect, useState } from "react";
import Game from "./components/game";
import fs from "fs";
import { resolve } from "path";
import Teams from "./interfaces/teams";
import { PathLike } from "fs";

const CACHE_DIR = resolve(environment.supportPath, "cache");

export default function main() {
  const [data, setData] = useState<FeedInterface[] | Error>();
  const [reloading, setReloading] = useState(true);
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
      setData(await get_data());
    }
    if (reloading) {
      f();
      setReloading(false);
    }
  }, [reloading]);
  return (
    <List isLoading={data === undefined}>
      {!(data instanceof Error) &&
        (data ?? [undefined]).map((item) => {
          if (typeof item === "undefined") {
            return <List.Item key="load" title="Loading..." />;
          }
          const title = `${item.gameData.teams.away.abbreviation} @ ${item.gameData.teams.home.abbreviation}`;
          let subtitle = item.gameData.status.detailedState;
          if (typeof item.liveData.linescore.teams.away.runs !== "undefined") {
            subtitle = `${item.liveData.linescore.teams.away.runs}-${item.liveData.linescore.teams.home.runs}, ${item.gameData.status.detailedState}`;
          }
          // If game hasn't started yet
          if (item.gameData.status.abstractGameCode.toUpperCase() === "P") {
            const d = new Date(item.gameData.datetime.dateTime);
            const tzName = d.toLocaleString("en", { timeZoneName: "short" }).split(" ").pop();
            const hrs = d.getHours() % 12;
            const date_string = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
              .getDate()
              .toString()
              .padStart(2, "0")} ${hrs ? hrs : 12}:${d.getMinutes().toString().padStart(2, "0")} ${
              d.getHours() >= 12 ? "pm" : "am"
            } ${tzName}`;
            subtitle = `${date_string}, ${item.gameData.status.detailedState}`;
          }
          return (
            <List.Item
              key={item.gamePk}
              title={title}
              subtitle={subtitle}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Actions">
                    <Action.Push title="Show Game" target={<Game game={item} />} />
                    <Action
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      title="Reload"
                      onAction={() => {
                        setData(undefined);
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

async function get_data() {
  const sortFunc = (a: FeedInterface, b: FeedInterface) => {
    switch ([a.gameData.status.abstractGameCode, b.gameData.status.abstractGameCode]) {
      case ["P", "L"]: {
        return -1;
      }
      case ["P", "F"]: {
        return -1;
      }
      case ["F", "L"]: {
        return -1;
      }
      case ["L", "F"]: {
        return 1;
      }
      case ["L", "P"]: {
        return 1;
      }
      case ["F", "P"]: {
        return -1;
      }
    }
    return 0;
  };
  const data: ScheduleInterface | Error = await fetch(
    getEndpoint("schedule", {}) + new URLSearchParams({ sportId: "1" })
  ).then(async (res) => {
    if (res.ok) {
      return (await res.json()) as ScheduleInterface;
    }
    return new Error("Something went wrong");
  });
  if (data instanceof Error) {
    // Handle this with a toast!
    return data;
  }

  const gamePks = data.dates[0] ? data.dates[0].games.map((game) => game.gamePk) : [];

  const games: (FeedInterface | Error)[] = await Promise.all(
    gamePks.map((gamePk) =>
      fetch(getEndpoint("game", { gamePk: gamePk })).then(async (res) => {
        if (res.ok) {
          return (await res.json()) as FeedInterface;
        }
        return new Error("Something went wrong");
      })
    )
  );
  let success = true;
  games.forEach((game) => {
    if (game instanceof Error) {
      success = false;
    }
  });
  if (!success) {
    return Error("Something went wrong");
  }
  return (games as FeedInterface[]).sort(sortFunc);
}
