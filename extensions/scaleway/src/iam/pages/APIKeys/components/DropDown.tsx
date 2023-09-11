import { List } from '@raycast/api'
import type { IAM } from '@scaleway/sdk'

type SelectOrderProps = {
  setOrderBy: (newValue: string) => void
}

const orderByList: IAM.v1alpha1.ListAPIKeysRequestOrderBy[] = [
  'access_key_asc',
  'access_key_desc',
  'created_at_asc',
  'created_at_desc',
  'expires_at_asc',
  'expires_at_desc',
  'updated_at_asc',
  'updated_at_desc',
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
