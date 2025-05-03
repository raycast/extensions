import { List } from '@raycast/api'
import { SearchKind, displayNameFor } from '../models/search_kind'

export function SearchKindDropdown(props: { onChange: (newValue: SearchKind) => void }) {
    return (
        <List.Dropdown
            tooltip='Search for&hellip;'
            storeValue={true}
            onChange={(newValue) => {
                props.onChange(newValue as SearchKind)
            }}>
            {Object.values(SearchKind).map((searchKind) => (
                <List.Dropdown.Item key={searchKind} title={displayNameFor(searchKind)} value={searchKind} />
            ))}
        </List.Dropdown>
    )
}
