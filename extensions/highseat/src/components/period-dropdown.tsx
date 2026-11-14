import { List } from "@raycast/api"
import { PERIODS } from "../lib/periods"

interface PeriodDropdownProps {
  value: string
  onChange: (period: string) => void
}

export function PeriodDropdown({ value, onChange }: PeriodDropdownProps) {
  return (
    <List.Dropdown tooltip="Period" value={value} onChange={onChange}>
      {PERIODS.map(period => (
        <List.Dropdown.Item key={period.value} value={period.value} title={period.title} />
      ))}
    </List.Dropdown>
  )
}
