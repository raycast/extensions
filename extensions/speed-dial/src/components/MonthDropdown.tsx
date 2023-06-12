import { List } from "@raycast/api";

type MonthRange = { id: string; name: string };

export function MonthsDropdown(props: { monthRanges: MonthRange[]; onRangeChange: (newValue: string) => void }) {
  const { monthRanges, onRangeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select months to filter events"
      storeValue={true}
      onChange={(newValue) => {
        onRangeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Date Range">
        {monthRanges.map((range) => (
          <List.Dropdown.Item key={range.id} title={range.name} value={range.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
