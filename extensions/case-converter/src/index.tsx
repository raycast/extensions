import { ActionPanel, Form, Action, Clipboard, showHUD } from "@raycast/api"
import { useState } from "react"
import to from "to-case"

interface Values {
  text: string;
  type: string;
}

export default function Command() {
  const [textError, setTextError] = useState<string | undefined>()

  const dropTextErrorIfNeeded = () => {
    if(textError && textError.length > 0) setTextError(undefined)
  }

  const handleSubmit = async (values: Values) => {
    const { text, type } = values
    if(!text) return
    const updatedText = to[type](text)
    await Clipboard.copy(updatedText)
    await showHUD(`Copied ${to.capital(type)} Case Value`)
  }

  return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Convert & Copy" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="text"
          title="Original Text"
          placeholder="Text to change"
          error={textError}
          onChange={dropTextErrorIfNeeded}
          onBlur={event => {
            if(event.target.value?.length == 0) setTextError("Can't be empty")
            else dropTextErrorIfNeeded()
          }}
        />

        <Form.Dropdown id="type" title="New Case" defaultValue="title">
          <Form.Dropdown.Item value="title" title="Title Case" />
          <Form.Dropdown.Item value="capital" title="Capital Case" />
          <Form.Dropdown.Item value="lower" title="lower case" />
          <Form.Dropdown.Item value="upper" title="UPPER CASE" />
          <Form.Dropdown.Item value="camel" title="camelCase" />
          <Form.Dropdown.Item value="pascal" title="PascalCase" />
          <Form.Dropdown.Item value="slug" title="slug-case" />
          <Form.Dropdown.Item value="snake" title="snake_case" />
        </Form.Dropdown>
      </Form>
  );
}
