import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import type { Game, Schedule } from "../../types/schedules";
import { capitalize } from "../../utils/capitalize";
import { formatRelativeTime, formatTimeRange } from "../../utils/format-time";
import { getStageAccessories, useSchedulesListContext } from ".";

type GameWithSchedule = Game & Omit<Schedule, "games">;

interface SchedulesListProps extends List.Props {
  schedules: Schedule[];
}

interface SchedulesListSectionProps {
  from: Date;
  games: GameWithSchedule[];
  to: Date;
}

interface SchedulesListItemProps {
  game: GameWithSchedule;
}

interface SchedulesRange {
  from: Date;
  games: GameWithSchedule[];
  to: Date;
}

function SchedulesListItem({ game }: SchedulesListItemProps) {
  const { openInBrowserAction } = useSchedulesListContext();

  return (
    <List.Item
      title={game.mode.name}
      subtitle={game.rule.name}
      icon={game.mode.icon ?? { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText }}
      accessories={
        [game.detail ? { tag: game.detail } : undefined, ...getStageAccessories(game.stages)].filter(
          Boolean,
        ) as List.Item.Accessory[]
      }
      keywords={[game.mode.name, game.rule.name, ...game.stages.map((stage) => stage.name)]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={openInBrowserAction.title} url={openInBrowserAction.url} />
          {(game.mode.wiki || game.rule.wiki) && (
            <ActionPanel.Section title="Inkipedia">
              {game.mode.wiki && (
                <Action.OpenInBrowser title={`Open “${game.mode.name}” in Inkipedia`} url={game.mode.wiki} />
              )}
              {game.rule.wiki && (
                <Action.OpenInBrowser title={`Open “${game.rule.name}” in Inkipedia`} url={game.rule.wiki} />
              )}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

function SchedulesListSection({ from, to, games }: SchedulesListSectionProps) {
  return (
    <List.Section
      title={formatTimeRange(from, to)}
      subtitle={
        Date.now() > from.getTime()
          ? capitalize(`${formatRelativeTime(to)} remaining`)
          : `Starting in ${formatRelativeTime(from)}`
      }
    >
      {games.map((game, index) => (
        <SchedulesListItem key={index} game={game} />
      ))}
    </List.Section>
  );
}

export function SchedulesListByTime({ schedules, ...props }: SchedulesListProps) {
  const { openInBrowserAction } = useSchedulesListContext();
  const ranges: SchedulesRange[] = useMemo(() => {
    const schedule = schedules.reduce(
      (a, b) => {
        return a.games.length > b.games.length ? a : b;
      },
      {
        mode: { name: "" },
        games: [],
      },
    );

    return schedule.games.map((game, index) => ({
      from: game.from,
      to: game.to,
      games: schedules.map((schedule) => ({
        ...schedule.games[index],
        mode: schedule.mode,
        detail: schedule.detail,
        icon: schedule.mode.icon,
      })),
    }));
  }, [schedules]);

  return (
    <List
      {...props}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={openInBrowserAction.title} url={openInBrowserAction.url} />
        </ActionPanel>
      }
    >
      {ranges?.map((range, index) => (
        <SchedulesListSection key={index} from={range.from} to={range.to} games={range.games} />
      )) ?? null}
    </List>
  );
}
