import { Action, ActionPanel, List } from '@raycast/api';
import { STANDING_DATA } from '../shared/consts';
import { StandingPosition } from '../shared/types';
import { MatchList } from './match';

export const StandingSectionHeader = () => (
  <List.Item title={'Club'} accessories={STANDING_DATA.map((s) => ({ text: s.header }))} />
);

export const StandingPositionItem = ({ standingPosition }: { standingPosition: StandingPosition }) => (
  <List.Item
    title={` ${standingPosition.position}   ${standingPosition.team.shortName}`}
    icon={standingPosition.team.crest}
    accessories={STANDING_DATA.map((s) => ({
      text: `${standingPosition[s.key]}`.padEnd(3),
    }))}
    actions={
      <ActionPanel>
        <Action.Push title="Show Matches" target={<MatchList team={standingPosition.team} />} />
      </ActionPanel>
    }
  />
);
