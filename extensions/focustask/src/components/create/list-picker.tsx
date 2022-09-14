import {Form} from "@raycast/api"
import {FC, useEffect, useMemo} from "react"
import {useFetchLists} from "api/hooks"
import {sortBy} from "lodash"

export const ListPicker: FC<{
  value: string | undefined
  onChange: (value: string) => void
}> = ({value, onChange}) => {
  const {lists, isLoading} = useFetchLists()
  const sortedLists = useMemo(
    () => sortBy(lists, (list) => list.weight),
    [lists],
  )

  useEffect(() => {
    const defaultList = sortedLists.find((list) => list.isDefault)

    if (!value && defaultList) {
      onChange(defaultList.id)
    }
  }, [isLoading])

  return (
    <Form.Dropdown id="listId" title="List" value={value} onChange={onChange}>
      {sortedLists.map((list) => (
        <Form.Dropdown.Item value={list.id} title={list.title} key={list.id} />
      ))}
    </Form.Dropdown>
  )
}
