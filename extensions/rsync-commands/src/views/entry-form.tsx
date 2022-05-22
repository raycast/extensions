import { Action, ActionPanel, Form, useNavigation } from "@raycast/api"
import { FC, useCallback, useEffect, useState } from "react"
import Entry, { EntryOption } from "../models/entry"
import rsyncOptions, { EntryOptionData } from "../data/rsync-options"
import Sugar from "sugar"
import useEntries from "../hooks/use-entries"
import EntryOptionFormFields from "../components/entry-option-form-fields"
import EntryLocationFormFields from "../components/entry-location-form-fields"
import EntryLocation from "../models/entry-location"
import EntryPreview from "./entry-preview"

const createEntryOption = (source: EntryOptionData): EntryOption => {
  return {
    name: source.name,
    param: source.param,
    enabled: false,
  } as EntryOption
}

type EntryFormProps = {
  source?: Entry
}

const EntryForm: FC<EntryFormProps> = ({ source }) => {
  const [entry, setEntry] = useState<Entry>(source || new Entry())
  const [optionFilter, setOptionFilter] = useState<string>("")
  const [visibleOptions, setVisibleOptions] = useState<EntryOptionData[]>([])

  const { pop } = useNavigation()
  const { addEntry, updateEntry, deleteEntry, runEntry, copyEntryCommand, entryRunning } = useEntries()

  const isUpdating = source && source.id

  const saveOrUpdateEntry = async () => {
    let success: boolean
    if (isUpdating) {
      success = await updateEntry(entry)
    } else {
      success = await addEntry(entry)
    }
    if (success) pop()
  }

  const removeEntry = () => {
    deleteEntry(entry)
    pop()
  }

  const getValue = useCallback(
    (propPath: string): string => {
      return Sugar.Object.get<boolean & string & EntryOption & undefined>(entry, propPath) ?? ""
    },
    [entry]
  )

  const setValue = (propPath: string, value: boolean | string | EntryOption | EntryLocation | undefined) => {
    const oldValue = getValue(propPath)

    if (oldValue !== value) {
      setEntry(prev => Sugar.Object.set(prev.clone(), propPath, value) as Entry)
    }
  }

  const onOptionChange = useCallback((optionName: string, update: EntryOption | undefined) => {
    setEntry(prev => {
      if (prev.options[optionName] !== update) {
        const clone = prev.clone()
        if (!update) {
          delete clone.options[optionName]
        } else {
          clone.options[optionName] = update
        }
        return clone
      }
      return prev
    })
  }, [])

  useEffect(
    function () {
      const filterString = optionFilter.toLowerCase()
      if (optionFilter) {
        setVisibleOptions(rsyncOptions.filter(rso => rso.name.toLowerCase().includes(filterString)))
      } else {
        setVisibleOptions(rsyncOptions)
      }
    },
    [optionFilter]
  )

  const cta = isUpdating ? "Update" : "Create"
  return (
    <Form
      isLoading={entryRunning}
      navigationTitle={cta}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={cta} onSubmit={saveOrUpdateEntry} />
          <Action title={"Run"} onAction={() => runEntry(entry)} />
          <Action
            title="Copy to Clipboard"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => copyEntryCommand(entry)}
          />
          <Action.Push
            title="Preview"
            target={<EntryPreview entry={entry} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          {source && (
            <Action
              title={"Delete"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={() => removeEntry()}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description text="General" />

      <Form.TextField
        id="name"
        title="Name*"
        placeholder="Website Backup, Photo Collection Sync..."
        autoFocus={false}
        defaultValue={getValue("name")}
        onChange={value => setValue("name", value)}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Describe the command to more easily remember it at a glance..."
        defaultValue={getValue("description")}
        onChange={value => setValue("description", value)}
      />

      <Form.Dropdown
        id="sshSelection"
        title="SSH"
        info="Use SSH for source or destination."
        defaultValue={getValue("sshSelection")}
        onChange={value => setValue("sshSelection", value)}
      >
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="source" title="Source" />
        <Form.Dropdown.Item value="destination" title="Destination" />
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description text="Source" />
      <EntryLocationFormFields
        identifier="source"
        location={entry.source}
        sshEnabled={entry.sshSelection === "source"}
        onChange={value => setValue("source", value)}
      />

      <Form.Separator />
      <Form.Description text="Destination" />
      <EntryLocationFormFields
        identifier="destination"
        location={entry.destination}
        sshEnabled={entry.sshSelection === "destination"}
        onChange={value => setValue("destination", value)}
      />

      <Form.Separator />
      <Form.Description text="Options" />

      <Form.TextField
        id="optionsFilter"
        title="Filter"
        info="Filter the list to find a specific option."
        onChange={setOptionFilter}
      />
      {visibleOptions.map(option => (
        <EntryOptionFormFields
          key={option.name}
          option={entry.options[option.name] ?? createEntryOption(option)}
          description={option.description}
          onChange={onOptionChange}
        />
      ))}

      <Form.Separator />
      <Form.Description text="Additional Commands" />

      <Form.TextArea
        key="preCommand"
        id="preCommand"
        title="Pre Command"
        info="A command to run before the rsync command itself, maybe setup some variables for the rsync command."
        defaultValue={entry.preCommand}
        onChange={value => setValue("preCommand", value)}
      />
      <Form.TextArea
        key="postCommand"
        id="postCommand"
        title="Post Command"
        info="A command to run after the rsync command itself, maybe do some cleanup."
        defaultValue={entry.postCommand}
        onChange={value => setValue("postCommand", value)}
      />
    </Form>
  )
}

export default EntryForm
