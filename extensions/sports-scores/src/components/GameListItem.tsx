import { List, Icon, Color, ActionPanel, Action, useNavigation } from '@raycast/api';
import { Game } from '../types';
import { format } from 'date-fns';
import GameDetail from './GameDetail';
import NavigationActions from './NavigationActions';
import React from 'react';

interface Props {
  game: Game;
  sport: string;
  league: string;
  searchLeague?: string;
  dateMode?: 'daily' | 'weekly';
  selectedWeek?: number | null;
  selectedSeasonType?: number;
  onPreviousDate: () => void;
  onNextDate: () => void;
  onPickDate: (date: Date | null) => void;
  onCurrentPeriod: () => void;
  onJumpToNFLWeek?: (week: number, seasonType: number) => void;
  onJumpToCFBWeek?: (week: number) => void;
}

export default function GameListItem({
  game,
  sport,
  league,
  searchLeague,
  dateMode = 'daily',
  selectedWeek,
  selectedSeasonType,
  onPreviousDate,
  onNextDate,
  onPickDate,
  onCurrentPeriod,
  onJumpToNFLWeek,
  onJumpToCFBWeek,
}: Props) {
  const { push } = useNavigation();
  const competition = game.competitions[0];
  const homeTeam = competition.competitors.find((c) => c.homeAway === 'home');
  const awayTeam = competition.competitors.find((c) => c.homeAway === 'away');

  if (!homeTeam || !awayTeam) return null;

  const status = game.status.type.state;
  const isLive = status === 'in';
  const isCompleted = status === 'post';

  let accessoryTitle = '';
  let accessoryColor = Color.SecondaryText;

  if (isLive) {
    accessoryTitle = game.status.type.shortDetail; // e.g. "4th 2:00"
    accessoryColor = Color.Green;
  } else if (isCompleted) {
    accessoryTitle = 'Final';
  } else {
    accessoryTitle = format(new Date(game.date), 'h:mm a');
  }

  const title = `${awayTeam.team.abbreviation} ${awayTeam.score} @ ${homeTeam.team.abbreviation} ${homeTeam.score}`;

  // Broadcast info for accessories
  const broadcasts = competition.broadcasts?.map((b) => b.names.join(', ')).join(' | ');

  return (
    <List.Item
      title={title}
      accessories={[
        { text: broadcasts, icon: broadcasts ? Icon.Monitor : undefined },
        { text: { value: accessoryTitle, color: accessoryColor } },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Show Details"
            icon={Icon.Sidebar}
            onAction={() => push(<GameDetail game={game} sport={sport} league={league} />)}
          />

          <NavigationActions
            dateMode={dateMode}
            searchLeague={searchLeague}
            selectedWeek={selectedWeek}
            selectedSeasonType={selectedSeasonType}
            onPreviousDate={onPreviousDate}
            onNextDate={onNextDate}
            onPickDate={onPickDate}
            onCurrentPeriod={onCurrentPeriod}
            onJumpToNFLWeek={onJumpToNFLWeek}
            onJumpToCFBWeek={onJumpToCFBWeek}
          />
        </ActionPanel>
      }
    />
  );
}
