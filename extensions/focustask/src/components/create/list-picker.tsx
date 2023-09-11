import {Form} from "@raycast/api"
import {useFetchLists} from "api/hooks"
import {sortBy} from "lodash"
import {forwardRef, Ref, useEffect, useMemo} from "react"

interface Props {
  value?: string | undefined
  onChange?: (value: string | undefined) => void
}

export const ListPicker = forwardRef(
  ({value, onChange}: Props, ref: Ref<Form.Dropdown>) => {
    const {lists, isLoading} = useFetchLists()
    const sortedLists = useMemo(
      () => sortBy(lists, (list) => list.weight),
      [lists],
    )

    useEffect(() => {
      const defaultList = sortedLists.find((list) => list.isDefault)

      if (!value && defaultList) {
        onChange?.(defaultList.id)
      }
    }, [isLoading])

    return (
      <Form.Dropdown
        id="listId"
        title="List"
        value={value}
        onChange={onChange}
        ref={ref}
      >
        {sortedLists.map((list) => (
          <Form.Dropdown.Item
            value={list.id}
            title={list.title}
            key={list.id}
          />
        ))}
      </Form.Dropdown>
    )
  },
)
