import { Grid, List } from "@raycast/api";

import { STREAMING_PLATFORMS, StreamingPlatformFilter } from "./anilist";

type StreamingFilterDropdownProps = {
  value: StreamingPlatformFilter;
  onChange: (value: StreamingPlatformFilter) => void;
};

export function ListStreamingFilterDropdown({ value, onChange }: StreamingFilterDropdownProps) {
  return (
    <List.Dropdown
      tooltip="Streaming Platform"
      value={value}
      onChange={(newValue) => onChange(newValue as StreamingPlatformFilter)}
    >
      <List.Dropdown.Item title="All Platforms" value="all" />
      {STREAMING_PLATFORMS.map((platform) => (
        <List.Dropdown.Item key={platform.value} title={platform.title} value={platform.value} />
      ))}
    </List.Dropdown>
  );
}

export function GridStreamingFilterDropdown({ value, onChange }: StreamingFilterDropdownProps) {
  return (
    <Grid.Dropdown
      tooltip="Streaming Platform"
      value={value}
      onChange={(newValue) => onChange(newValue as StreamingPlatformFilter)}
    >
      <Grid.Dropdown.Item title="All Platforms" value="all" />
      {STREAMING_PLATFORMS.map((platform) => (
        <Grid.Dropdown.Item key={platform.value} title={platform.title} value={platform.value} />
      ))}
    </Grid.Dropdown>
  );
}
