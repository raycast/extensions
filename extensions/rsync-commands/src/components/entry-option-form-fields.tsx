import { FC, Fragment, useEffect, useState } from "react"
import { EntryOption } from "../models/entry"
import { Form } from "@raycast/api"
import { EntryOptionData } from "../data/rsync-options"

type EntryOptionFormFieldsProps = {
  option?: EntryOption
  optionSource: EntryOptionData
  onChange: (option: EntryOption | undefined) => void
}

const constructOption = (source: EntryOptionData): EntryOption => {
  return {
    name: source.name,
    description: source.description,
    param: source.param,
    value: "",
    enabled: false,
  }
}

const EntryOptionFormFields: FC<EntryOptionFormFieldsProps> = ({ option, optionSource, onChange }) => {
  const [editedOption, setEditedOption] = useState<EntryOption | undefined>()

  useEffect(
    function () {
      setEditedOption(option ?? constructOption(optionSource))
    },
    [option, optionSource]
  )

  return editedOption ? (
    <Fragment key={`option-${editedOption.name}`}>
      <Form.Checkbox
        id={`option-${editedOption.name}-enabled`}
        label={`--${editedOption.name}`}
        defaultValue={editedOption.enabled}
        info={editedOption.description}
        onChange={(enable: boolean) => {
          let clone: EntryOption | undefined = { ...editedOption }
          const enabled = editedOption.enabled
          const hadValue = editedOption.value
          if (enable || (!enable && enabled !== undefined)) {
            if (!enable && !hadValue) {
              clone = undefined
            } else if (!!enabled !== enable) {
              clone.enabled = enable
            }
          }
          onChange(clone)
        }}
      />

      {editedOption.param && editedOption.enabled && (
        <Form.TextField
          id={`option-${editedOption.name}-value`}
          placeholder={editedOption.param}
          defaultValue={editedOption.value}
          onChange={value => {
            const clone: EntryOption = { ...editedOption }
            clone.value = value
            onChange(clone)
          }}
        />
      )}
    </Fragment>
  ) : null
}

export default EntryOptionFormFields
