import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useLeague } from "../contexts/leagueContext";
import usePlayByPlay from "../hooks/usePlayByPlay";
import { Game } from "../types/schedule.types";

/**
 * TODO: Instead of having a hardcoded value for the maximum line length, we should calculate it based on the
 *       remaining time and scores. This will allow us to display more information in the play by play view.
 */
const MAX_LINE_LENGTH = 67;
const BUFFER_CHUNK_LENGTH = 3;

export type PropTypes = {
  game: Game;
};

export function PlayByPlay({ game }: PropTypes) {
  const { value: league } = useLeague();
  const {
    data: playsByPeriod,
    isLoading,
    revalidate,
  } = usePlayByPlay(league, game.id, game.status.inProgress ? "asc" : "desc");

  const [homeTeam, awayTeam] = game.competitors;
  const teamIdToLogo = useMemo(
    () => ({
      [homeTeam.id]: homeTeam.logo,
      [awayTeam.id]: awayTeam.logo,
    }),
    [homeTeam, awayTeam],
  );

  const periodTypes = Object.values(playsByPeriod ?? {})
    .map(({ period }) => period.text.split(" ")[1] ?? period.text)
    .reduce((accumulator, item) => {
      if (!accumulator.includes(item)) {
        accumulator.push(item);
      }

      return accumulator;
    }, [] as string[])
    .reverse();

  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Period"
          onChange={(newValue) => {
            if (newValue === "") {
              setSelectedPeriod(null);
            } else {
              setSelectedPeriod(Number(newValue));
            }
          }}
          defaultValue={selectedPeriod?.toString() ?? ""}
        >
          <List.Dropdown.Section>
            <List.Dropdown.Item value={""} title={"All Periods"} />
          </List.Dropdown.Section>
          {periodTypes.map((periodType) => (
            <List.Dropdown.Section key={periodType} title={`${periodType}s`}>
              {Object.values(playsByPeriod ?? {})
                .filter(({ period }) => period.text.includes(periodType))
                .map(({ period }) => (
                  <List.Dropdown.Item key={period.number} value={period.number.toString()} title={period.text} />
                ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {playsByPeriod == null ? (
        <List.EmptyView
          title={isLoading ? "Loading Play by Play View" : "No Play by Play Found"}
          description={
            isLoading
              ? "Please hang on while fetching the play by play data for this game..."
              : "No play by play data could be found for this game, try again later."
          }
        />
      ) : (
        Object.entries(playsByPeriod)
          .filter(([period]) => {
            if (selectedPeriod === null) {
              return true;
            }

            return Number(period) === selectedPeriod;
          })
          .sort(([a], [b]) => (game.status.inProgress ? 1 : -1) * (Number(b) - Number(a)))
          .map(([, { period, plays }]) => (
            <List.Section key={period.number} title={period.text}>
              {plays?.map((play) => {
                const shouldTruncate = play.text.length + play.type.text.length > MAX_LINE_LENGTH;

                const actualTitle = shouldTruncate
                  ? `${play.text.slice(0, MAX_LINE_LENGTH - play.type.text.length - BUFFER_CHUNK_LENGTH)}...`
                  : play.text;
                const actualTooltip = shouldTruncate ? play.text : undefined;

                return (
                  <List.Item
                    id={play.id}
                    key={play.id}
                    icon={play?.team?.id ? teamIdToLogo[play.team.id] : undefined}
                    title={{
                      value: actualTitle,
                      tooltip: actualTooltip,
                    }}
                    subtitle={{
                      value: play.type.text,
                    }}
                    accessories={[
                      {
                        tag: `Q${play.period.number} ${play.clock.value}`,
                        icon: Icon.Clock,
                        tooltip: play.clock.timestamp.toLocaleString(),
                      },
                      {
                        text: `${play.score.current.away}`,
                        icon: awayTeam.logo,
                        tooltip: `${awayTeam.shortName} - ${play.score.current.away}`,
                      },
                      {
                        text: `${play.score.current.home}`,
                        icon: homeTeam.logo,
                        tooltip: `${homeTeam.shortName} - ${play.score.current.home}`,
                      },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action
                          title={"Refresh"}
                          icon={Icon.ArrowClockwise}
                          onAction={revalidate}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          ))
      )}
    </List>
  );
}
