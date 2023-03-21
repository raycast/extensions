import { List } from '@raycast/api'
import type { Container } from '@scaleway/sdk'
import type { Dispatch, SetStateAction } from 'react'
import { getIconFromLocality } from '../../helpers/locality'

type ContainerDropdownProps = {
  setSelectedNamespaceId: Dispatch<SetStateAction<string>>
  namespaces?: Container.v1beta1.Namespace[]
}
export const ContainerDropdown = ({
  setSelectedNamespaceId,
  namespaces,
}: ContainerDropdownProps) => (
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
