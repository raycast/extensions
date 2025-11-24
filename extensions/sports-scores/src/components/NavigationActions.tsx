import { ActionPanel, Action, Icon } from '@raycast/api';
import React from 'react';
import { NFLSeasonType } from '../utils/dateHelpers';

interface NavigationActionsProps {
  // Context info
  dateMode: 'daily' | 'weekly';
  searchLeague?: string;

  // Current state
  selectedWeek?: number | null;
  selectedSeasonType?: number;

  // Navigation handlers
  onPreviousDate: () => void;
  onNextDate: () => void;
  onPickDate: (date: Date | null) => void;
  onCurrentPeriod: () => void;
  onJumpToNFLWeek?: (week: number, seasonType: number) => void;
  onJumpToCFBWeek?: (week: number) => void;
}

export default function NavigationActions({
  dateMode,
  searchLeague,
  selectedWeek,
  selectedSeasonType,
  onPreviousDate,
  onNextDate,
  onPickDate,
  onCurrentPeriod,
  onJumpToNFLWeek,
  onJumpToCFBWeek,
}: NavigationActionsProps) {
  const isNFL = searchLeague === 'football/nfl';
  const isCFB = searchLeague === 'football/college-football';
  const isFootball = isNFL || isCFB;

  // Determine label text based on context
  const previousLabel = dateMode === 'weekly' ? 'Previous Week' : 'Previous Day';
  const nextLabel = dateMode === 'weekly' ? 'Next Week' : 'Next Day';
  const currentLabel = dateMode === 'weekly' ? 'This Week' : 'Today';

  return (
    <ActionPanel.Section title="Navigation">
      {/* Previous/Next Navigation */}
      <Action
        title={previousLabel}
        icon={Icon.ChevronLeft}
        shortcut={{ modifiers: ['cmd', 'ctrl'], key: '[' }}
        onAction={onPreviousDate}
      />
      <Action
        title={nextLabel}
        icon={Icon.ChevronRight}
        shortcut={{ modifiers: ['cmd', 'ctrl'], key: ']' }}
        onAction={onNextDate}
      />

      {/* Current Period (This Week / Today) */}
      <Action title={currentLabel} icon={Icon.Calendar} onAction={onCurrentPeriod} />

      {/* Pick Specific Date (for non-weekly views) */}
      {!isFootball && (
        <Action.PickDate title="Pick Specific Date" icon={Icon.Calendar} onChange={onPickDate} />
      )}

      {/* NFL Week Submenu */}
      {isNFL && onJumpToNFLWeek && (
        <ActionPanel.Submenu title="Jump to Week" icon={Icon.List}>
          <ActionPanel.Section title="Regular Season">
            {Array.from({ length: 18 }, (_, i) => (
              <Action
                key={`week-${i + 1}`}
                title={`Week ${i + 1}`}
                icon={
                  selectedWeek === i + 1 && selectedSeasonType === NFLSeasonType.RegularSeason
                    ? Icon.Checkmark
                    : undefined
                }
                onAction={() => onJumpToNFLWeek(i + 1, NFLSeasonType.RegularSeason)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Postseason">
            <Action
              title="Wild Card"
              icon={
                selectedWeek === 1 && selectedSeasonType === NFLSeasonType.Postseason
                  ? Icon.Checkmark
                  : undefined
              }
              onAction={() => onJumpToNFLWeek(1, NFLSeasonType.Postseason)}
            />
            <Action
              title="Divisional"
              icon={
                selectedWeek === 2 && selectedSeasonType === NFLSeasonType.Postseason
                  ? Icon.Checkmark
                  : undefined
              }
              onAction={() => onJumpToNFLWeek(2, NFLSeasonType.Postseason)}
            />
            <Action
              title="Conference"
              icon={
                selectedWeek === 3 && selectedSeasonType === NFLSeasonType.Postseason
                  ? Icon.Checkmark
                  : undefined
              }
              onAction={() => onJumpToNFLWeek(3, NFLSeasonType.Postseason)}
            />
            <Action
              title="Super Bowl"
              icon={
                selectedWeek === 4 && selectedSeasonType === NFLSeasonType.Postseason
                  ? Icon.Checkmark
                  : undefined
              }
              onAction={() => onJumpToNFLWeek(4, NFLSeasonType.Postseason)}
            />
          </ActionPanel.Section>
        </ActionPanel.Submenu>
      )}

      {/* CFB Week Submenu */}
      {isCFB && onJumpToCFBWeek && (
        <ActionPanel.Submenu title="Jump to Week" icon={Icon.List}>
          <ActionPanel.Section title="Regular Season">
            {Array.from({ length: 15 }, (_, i) => (
              <Action
                key={`week-${i + 1}`}
                title={`Week ${i + 1}`}
                icon={selectedWeek === i + 1 ? Icon.Checkmark : undefined}
                onAction={() => onJumpToCFBWeek(i + 1)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Postseason">
            <Action
              title="Bowl Games"
              icon={selectedWeek === 16 ? Icon.Checkmark : undefined}
              onAction={() => onJumpToCFBWeek(16)}
            />
            <Action
              title="CFP Quarterfinals"
              icon={selectedWeek === 17 ? Icon.Checkmark : undefined}
              onAction={() => onJumpToCFBWeek(17)}
            />
            <Action
              title="CFP Semifinals"
              icon={selectedWeek === 18 ? Icon.Checkmark : undefined}
              onAction={() => onJumpToCFBWeek(18)}
            />
            <Action
              title="CFP Championship"
              icon={selectedWeek === 19 ? Icon.Checkmark : undefined}
              onAction={() => onJumpToCFBWeek(19)}
            />
          </ActionPanel.Section>
        </ActionPanel.Submenu>
      )}
    </ActionPanel.Section>
  );
}
