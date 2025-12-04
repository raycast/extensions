import { List } from '@raycast/api'
import { DATE_RANGE_OPTIONS } from '../constants'

export const DropdownRange = ({
  onChangeRange,
  selectedRange,
}: {
  onChangeRange: (range: string) => void
  selectedRange: string
}) => {
  return (
    <List.Dropdown tooltip="Select range" value={selectedRange} onChange={onChangeRange}>
      {DATE_RANGE_OPTIONS.map((range) => (
        <List.Dropdown.Item key={range.value} title={range.label} value={range.value} />
      ))}
    </List.Dropdown>
  )
}
