import { List } from '@raycast/api'
import { SearchType } from '../types/index'

export default function SearchDropdown(props: {
  searchTypes: SearchType[]
  onSearchTypeChange: (newValue: string) => void
}) {
  const { searchTypes, onSearchTypeChange } = props
  return (
    <List.Dropdown
      tooltip="Select Search Type"
      storeValue={true}
      onChange={(newValue) => {
        onSearchTypeChange(newValue)
      }}
    >
      <List.Dropdown.Section title="Search Type">
        {searchTypes.map((searchType) => (
          <List.Dropdown.Item key={searchType.id} title={searchType.name} value={searchType.value} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  )
}
