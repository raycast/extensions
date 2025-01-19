import { List } from '@raycast/api'
import { RouterOutputs, trpc } from '../utils/trpc.util'

type DrinkType = { id: string; name: string }

export function BookmarkFilter(props: {
  me?: RouterOutputs['user']['me']
  // drinkTypes: DrinkType[];
  // onDrinkTypeChange: (newValue: string) => void
}) {
  const { me } = props
  const { data: tags } = trpc.tag.list.useQuery(
    {
      spaceIds: me?.associatedSpaces.map((space) => space.id) ?? [],
    },
    {
      enabled: !!me,
    }
  )

  return (
    <List.Dropdown
      tooltip="Select Drink Type"
      storeValue={true}
      onChange={(newValue) => {
        // console.log(newValue)
        // onDrinkTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Tags">
        {tags?.map((tag) => <List.Dropdown.Item key={tag.id} title={tag.name} value={tag.id} icon={tag.space.image} />)}
      </List.Dropdown.Section>
    </List.Dropdown>
  )
}
