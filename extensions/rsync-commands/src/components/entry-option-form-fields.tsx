import { FC, memo } from "react"
import { EntryOption } from "../models/entry"
import { Form } from "@raycast/api"

type EntryOptionFormFieldsProps = {
  option: EntryOption
  description: string
  onChange: (optionName: string, update: EntryOption | undefined) => void
}

const EntryOptionFormFields: FC<EntryOptionFormFieldsProps> = ({ option, description, onChange }) => {
  return (
    <>
      <Form.Checkbox
        id={`option-${option.name}-enabled`}
        label={`--${option.name}`}
        defaultValue={option.enabled}
        info={description}
        onChange={enable => {
          const enabled = option.enabled
          const hadValue = option.value

          if (!enable && !hadValue) {
            onChange(option.name, undefined)
          } else if (enabled !== enable) {
            const clone: EntryOption = { ...option, enabled: enable }
            onChange(option.name, clone)
          }
        }}
      />

      {option.enabled && option.param && (
        <Form.TextField
          id={`option-${option.name}-value`}
          placeholder={option.param}
          defaultValue={option.value}
          onChange={value => {
            const clone: EntryOption = { ...option, value }
            onChange(option.name, clone)
          }}
        />
      )}
    </>
  )
}

export default memo(EntryOptionFormFields)
