import { List } from '@raycast/api'
import type { Registry } from '@scaleway/sdk'
import type { Dispatch, SetStateAction } from 'react'
import { getIconFromLocality } from '../../../../helpers/locality'

type NamespaceDropdownProps = {
  setSelectedNamespaceId: Dispatch<SetStateAction<string>>
  namespaces?: Registry.v1.Namespace[]
}
export const NamespaceDropdown = ({
  setSelectedNamespaceId,
  namespaces,
}: NamespaceDropdownProps) => (
  <List.Dropdown
    tooltip="Change Namespace"
    placeholder="Search namespace..."
    storeValue
    onChange={setSelectedNamespaceId}
  >
    {namespaces?.map((namespace) => (
      <List.Dropdown.Item
        key={namespace.id}
        title={namespace.name}
        value={namespace.id}
        icon={getIconFromLocality(namespace.region)}
      />
    ))}
  </List.Dropdown>
)
