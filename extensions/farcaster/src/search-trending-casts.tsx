import { List } from '@raycast/api';
import { useTrendingCasts } from './hooks';
import { useState } from 'react';
import CastListItem from './components/CastListItem';
import { Cast } from './utils/types';

const TIME_WINDOW = ['1h', '6h', '12h', '24h'];
export default function SearchTrendingCasts() {
  const [timeWindow, setTimeWindow] = useState(TIME_WINDOW[3]);
  const { data, isLoading, pagination } = useTrendingCasts(timeWindow);

  function onTimeWindowChange(timeValue: string) {
    setTimeWindow(timeValue);
  }

  return (
    <List
      isLoading={data === null || isLoading}
      navigationTitle="Trending Casts"
      searchBarPlaceholder="Filter cast keywords"
      pagination={pagination}
      searchBarAccessory={<RangeDropdown value={timeWindow} onTimeWindowChange={onTimeWindowChange} />}
      throttle
    >
      <List.Section title="Recent Casts" subtitle={data ? data?.length.toString() : '0'}>
        {(data as Cast[])?.map((cast) => <CastListItem key={cast.hash} cast={cast} />)}
      </List.Section>
    </List>
  );
}

interface RangeDropdownProps {
  onTimeWindowChange: (value: string) => void;
  value: string;
}

function RangeDropdown({ onTimeWindowChange, value }: RangeDropdownProps) {
  return (
    <List.Dropdown tooltip="Select Time Window" onChange={onTimeWindowChange} value={value}>
      {TIME_WINDOW.map((timeRange) => (
        <List.Dropdown.Item key={timeRange} title={timeRange} value={timeRange} />
      ))}
    </List.Dropdown>
  );
}
