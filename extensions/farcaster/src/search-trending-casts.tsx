import { List } from "@raycast/api";
import { useState } from "react";
import CastListItem from "./components/CastListItem";
import { Cast } from "./utils/types";
import { Dropdown } from "./components/Dropdown";
import { useTrendingCasts } from "./hooks/useTrendingCasts";

const TIME_WINDOW = [
  { label: "1h", value: "1h" },
  { label: "6h", value: "6h" },
  { label: "12h", value: "12h" },
  { label: "24h", value: "24h" },
];
export default function SearchTrendingCasts() {
  const [timeWindow, setTimeWindow] = useState(TIME_WINDOW[3]?.value);
  const { data, isLoading, pagination } = useTrendingCasts(timeWindow);

  function onTimeWindowChange(timeValue: string) {
    setTimeWindow(timeValue);
  }

  return (
    <List
      isLoading={data === null || isLoading}
      searchBarPlaceholder="Filter cast keywords"
      pagination={pagination}
      searchBarAccessory={
        <Dropdown
          options={TIME_WINDOW}
          onDropdownChange={onTimeWindowChange}
          value={timeWindow}
          tooltip="Select Time Window"
        />
      }
      throttle
    >
      <List.Section title="Recent Casts" subtitle={data ? data?.length.toString() : undefined}>
        {(data as Cast[])?.map((cast) => (
          <CastListItem key={cast.hash} cast={cast} />
        ))}
      </List.Section>
    </List>
  );
}
