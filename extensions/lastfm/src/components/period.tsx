import { List } from "@raycast/api";

type PeriodType = { value: string; label: string };

const Periods = [
  { value: "7day", label: "Last 7 Days" },
  { value: "1month", label: "Last 30 Days" },
  { value: "3month", label: "Last 90 Days" },
  { value: "6month", label: "Last 180 Days" },
  { value: "12month", label: "Last 365 Days" },
  { value: "overall", label: "All Time" },
] as PeriodType[];

export function PeriodDropdown(props: { selectedPeriod: string; onPeriodChange: (newValue: string) => void }) {
  const { onPeriodChange, selectedPeriod } = props;
  return (
    <List.Dropdown
      tooltip="Select Date Period"
      storeValue={true}
      value={selectedPeriod}
      onChange={(newValue: string) => {
        onPeriodChange(newValue);
      }}
    >
      <List.Dropdown.Section>
        {Periods.map((period: PeriodType) => (
          <List.Dropdown.Item key={period.value} title={period.label} value={period.value} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
