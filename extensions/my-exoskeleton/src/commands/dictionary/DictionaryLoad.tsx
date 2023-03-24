import { Action, ActionPanel, Detail, Form, getPreferenceValues } from '@raycast/api'
import { useEffect, useState } from 'react'
import { readCSV } from '../../utils/file'
import { getCollection } from '../../utils/mysql'
import {
  COLLECTION_NAME,
  DictionaryPreference,
  DictionaryRecord,
  SCHEMA_NAME,
  toDBRecord
} from '../../constants/dictionary'
import { Collection } from '@mysql/xdevapi'

interface FileFormValue {
  files: string[]
}

function DictionarySelection(props: { onSelect: (file: string) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={(value: FileFormValue) => {
              const [file] = value.files
              props.onSelect(file)
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" allowMultipleSelection={false} />
    </Form>
  )
}

export function DictionaryLoadCommand() {
  const [file, setFile] = useState('')
  const [count, setCount] = useState(0)
  const { dictionaryUrl } = getPreferenceValues<DictionaryPreference>()

  useEffect(() => {
    if (file === '') {
      return
    }
  }, [file, dictionaryUrl])

  if (file === '') {
    return (
      <DictionarySelection
        onSelect={async (file) => {
          const collection: Collection = await getCollection(dictionaryUrl, SCHEMA_NAME, COLLECTION_NAME)
          readCSV(file, {
            onRow: async (row: DictionaryRecord) => {
              return collection
                .add(toDBRecord(row))
                .execute()
                .then(() => setCount((c) => c + 1))
            }
          })
          setFile(file)
        }}
      />
    )
  }

  console.log('file', file)

  return (
    <Detail
      markdown={`
  ## File
  ${file}
  ## Count
  ${count}
  `}
      actions={
        <ActionPanel>
          <Action title="" onAction={() => setFile('')} />
        </ActionPanel>
      }
    />
  )
}
