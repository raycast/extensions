import { FC } from "react"
import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api"
import Entry from "../models/entry"
import useEntries from "../hooks/use-entries"

type EntryPreviewProps = {
  entry: Entry
}

const EntryPreview: FC<EntryPreviewProps> = ({ entry }) => {
  const { formatErrorsAsList } = useEntries()
  const { pop } = useNavigation()

  const errors = entry.getErrors(true)
  const previewTitle = "Command preview"
  const errorTitle = `Entry has ${errors.length > 1 ? "errors" : "an error"}`
  const title = errors.length ? errorTitle : previewTitle

  const body = errors.length ? formatErrorsAsList(errors, true) : entry.getCommand()
  const md = `# ${title}
	${body}
	`

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action title="Done" onAction={() => pop()} />
        </ActionPanel>
      }
    />
  )
}

export default EntryPreview
