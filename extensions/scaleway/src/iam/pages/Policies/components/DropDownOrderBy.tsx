import { List } from '@raycast/api'
import type { Iamv1alpha1 } from '@scaleway/sdk'

type SelectOrderProps = {
  setOrderBy: (newValue: string) => void
}

const orderByList: Iamv1alpha1.ListPoliciesRequestOrderBy[] = [
  'created_at_asc',
  'created_at_desc',
  'policy_name_asc',
  'policy_name_desc',
]

export const DropDownOrderBy = ({ setOrderBy }: SelectOrderProps) => (
  <List.Dropdown tooltip="Select OrderBy" storeValue onChange={setOrderBy}>
    <List.Dropdown.Section title="Select OrderBy">
      {orderByList.map((orderBy) => (
        <List.Dropdown.Item key={orderBy} title={orderBy} value={orderBy} />
      ))}
    </List.Dropdown.Section>
  </List.Dropdown>
)
