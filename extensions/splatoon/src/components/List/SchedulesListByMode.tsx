import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { Game, Schedule } from "../../types/schedules";
import { formatTimeRange } from "../../utils/format-time";
import { getStageAccessories, useSchedulesListContext } from ".";

interface SchedulesListProps extends List.Props {
  schedules: Schedule[];
}

interface SchedulesListSectionProps {
  schedule: Schedule;
}

interface SchedulesListItemProps {
  game: Game;
}

function SchedulesListItem({ game }: SchedulesListItemProps) {
  const { openInBrowserAction } = useSchedulesListContext();

  return (
    <List.Item
      title={game.rule.name}
      subtitle={formatTimeRange(game.from, game.to)}
      icon={game.rule.icon ?? { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText }}
      accessories={getStageAccessories(game.stages)}
      keywords={[game.rule.name, ...game.stages.map((stage) => stage.name)]}
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

function SchedulesListSection({ schedule }: SchedulesListSectionProps) {
  return (
    <List.Section subtitle={schedule.detail} title={schedule.mode.name}>
      {schedule.games.map((game, index) => (
        <SchedulesListItem key={index} game={game} />
      ))}
    </List.Section>
  );
}

export function SchedulesListByMode({ schedules, ...props }: SchedulesListProps) {
  const { openInBrowserAction } = useSchedulesListContext();

  return (
    <List
      {...props}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={openInBrowserAction.title} url={openInBrowserAction.url} />
        </ActionPanel>
      }
    >
      {schedules.map((schedule, index) => (
        <SchedulesListSection key={index} schedule={schedule} />
      ))}
    </List>
  );
}
