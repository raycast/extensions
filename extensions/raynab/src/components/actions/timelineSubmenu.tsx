import { type Period, onTimelineType } from '@srcTypes';

import { renderActionIcon } from './actionIcon';
import { ActionPanel, Action, Icon } from '@raycast/api';
import { Shortcuts } from '@constants';

export function TimelineSubmenu({
  onTimelineChange,
  currentTimeline,
}: {
  onTimelineChange: onTimelineType;
  currentTimeline: Period;
}) {
  const renderTimelineIcon = renderActionIcon<Period>({
    defaultIcon: Icon.Calendar,
    currentType: currentTimeline,
  });

  return (
    <ActionPanel.Submenu icon={Icon.Calendar} title="Set Timeline" shortcut={Shortcuts.Timeline}>
      <Action title="Last Day" icon={renderTimelineIcon('day')} onAction={() => onTimelineChange('day')} />
      <Action title="Last Week" icon={renderTimelineIcon('week')} onAction={() => onTimelineChange('week')} />
      <Action title="Last Month" icon={renderTimelineIcon('month')} onAction={() => onTimelineChange('month')} />
      <Action title="Last Quarter" icon={renderTimelineIcon('quarter')} onAction={() => onTimelineChange('quarter')} />
      <Action title="Last Year" icon={renderTimelineIcon('year')} onAction={() => onTimelineChange('year')} />
    </ActionPanel.Submenu>
  );
}
