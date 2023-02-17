import { Action, ActionPanel, List } from '@raycast/api';
import { CountryDetail } from './CountryDetail';

interface CountryItemProps {
  country: Country;
  pinned?: boolean;
  onAction?: () => void;
}

export const CountryItem = (props: CountryItemProps) => {
  const { country, pinned = false, onAction } = props;
  return (
    <List.Item
      title={country.name}
      icon={country.emoji}
      detail={<CountryDetail country={country} />}
      actions={
        <ActionPanel>
          <Action
            title={`${pinned ? 'Unpin' : 'Pin'} country`}
            onAction={onAction}
          />
        </ActionPanel>
      }
    />
  );
};
