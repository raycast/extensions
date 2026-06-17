import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import groupBy from "lodash.groupby";
import { useState } from "react";
import { getBroadcasters, getFixtures } from "./api";
import Match from "./components/match";
import { Broadcast } from "./types";
import { Matchday } from "./types/firebase";
import { convertToLocalTime } from "./utils";

export default function Fixture() {
  const [competition, setCompetition] = useState<string>("bundesliga");
  const [matchday, setMatchday] = useState<number>();

  const { data: fixtures, isLoading } = usePromise(getFixtures, [
    competition,
    matchday,
  ]);
  const { data: broadcasts } = usePromise(
    async (md: Matchday | undefined) => {
      return md
        ? await getBroadcasters(
            md.dflDatalibraryCompetitionId,
            md.dflDatalibrarySeasonId,
            md.dflDatalibraryMatchdayId,
          )
        : [];
    },
    [fixtures?.[0]],
  );

  const categories = fixtures
    ? groupBy(fixtures, (f) => {
        if (f.plannedKickOff) {
          return convertToLocalTime(f.plannedKickOff, "EEEE dd-MMM-yyyy");
        } else {
          const start = convertToLocalTime(
            f.matchdayRange.start,
            "dd-MMM-yyyy",
          );
          const end = convertToLocalTime(f.matchdayRange.end, "dd-MMM-yyyy");

          return `${start} - ${end}`;
        }
      })
    : {};

  const broadcastMap = broadcasts?.reduce(
    (out: { [matchId: string]: Broadcast }, cur) => {
      out[cur.dflDatalibraryMatchId] = cur;

      return out;
    },
    {},
  );

  return (
    <List
      throttle
      isLoading={isLoading}
      navigationTitle={
        !fixtures
          ? "Fixtures & Results"
          : `Matchday ${fixtures[0].matchday} | Fixtures & Results`
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Competition"
          value={competition}
          onChange={setCompetition}
        >
          <List.Dropdown.Item
            title="Bundesliga"
            value="bundesliga"
            icon="bundesliga.svg"
          />
          <List.Dropdown.Item
            title="2. Bundesliga"
            value="2bundesliga"
            icon="2bundesliga.svg"
          />
        </List.Dropdown>
      }
    >
      {Object.entries(categories).map(([day, matches], key) => {
        return (
          <List.Section title={day} key={key}>
            {matches.map((match) => {
              const { teams, score, matchStatus } = match;

              let icon: Image.ImageLike;
              if (!match.plannedKickOff) {
                icon = Icon.Clock;
              } else if (matchStatus.toLowerCase().includes("half")) {
                icon = { source: Icon.Livestream, tintColor: Color.Red };
              } else if (matchStatus.toLowerCase().includes("final")) {
                icon = { source: Icon.CheckCircle, tintColor: Color.Green };
              } else {
                icon = Icon.Calendar;
              }

              const accessories: List.Item.Accessory[] = [];

              if (matchStatus.toLowerCase().includes("half")) {
                accessories.unshift({
                  tag: {
                    value: `${match.minuteOfPlay.minute}'00`,
                    color: Color.Red,
                  },
                });
              }

              if (broadcastMap && broadcastMap[match.dflDatalibraryMatchId]) {
                const broadcast = broadcastMap[match.dflDatalibraryMatchId];
                accessories.push({
                  icon: {
                    source: {
                      light: broadcast.logo,
                      dark: broadcast.logoDark,
                    },
                  },
                  tooltip: broadcast.broadcasterName,
                });
              }

              return (
                <List.Item
                  key={match.seasonOrder}
                  icon={icon}
                  title={
                    match.plannedKickOff
                      ? convertToLocalTime(match.plannedKickOff, "HH:mm")
                      : "TBC"
                  }
                  subtitle={
                    score
                      ? `${teams.home.nameFull} ${score.home.live} - ${score.away.live} ${teams.away.nameFull}`
                      : `${teams.home.nameFull} - ${teams.away.nameFull}`
                  }
                  accessories={accessories}
                  keywords={[
                    teams.home.nameFull,
                    teams.home.nameShort,
                    teams.away.nameFull,
                    teams.away.nameShort,
                  ]}
                  actions={
                    <ActionPanel>
                      {/* {matchStatus === "PRE_MATCH" && (
                        <Action.OpenInBrowser
                          title="Buy Ticket"
                          icon={Icon.Wallet}
                          url={teams.home.boxOfficeUrl}
                        />
                      )} */}
                      <Action.Push
                        title="Match Stats"
                        icon={Icon.Sidebar}
                        target={<Match {...match} />}
                      />
                      <ActionPanel.Section title="Matchday">
                        {match.matchday > 1 && (
                          <Action
                            title={`Matchday ${match.matchday - 1}`}
                            icon={Icon.ArrowLeftCircle}
                            onAction={() => {
                              setMatchday(match.matchday - 1);
                            }}
                          />
                        )}
                        {match.matchday < 36 && (
                          <Action
                            title={`Matchday ${match.matchday + 1}`}
                            icon={Icon.ArrowRightCircle}
                            onAction={() => {
                              setMatchday(match.matchday + 1);
                            }}
                          />
                        )}
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
