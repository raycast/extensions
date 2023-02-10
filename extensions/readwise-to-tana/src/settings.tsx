import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  useNavigation,
} from '@raycast/api'
import React from 'react'

type Settings = {
  highlightTemplate: string
  template: string
}

export default function Settings() {
  const { pop } = useNavigation()
  const [template, setTemplate] = React.useState<string>('')

  React.useEffect(() => {
    const getTemplate = async () => {
      const template = await LocalStorage.getItem<string>('template')

      setTemplate(template ?? '%%tana%%\n')
    }

    getTemplate()
  }, [])

  const handleSubmit = async (values: Settings) => {
    await LocalStorage.setItem('template', values.template)
    pop()
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save template" />
        </ActionPanel>
      }
    >
      <Form.TextArea
        info="This template is used when copying highlights. It uses Handlebars templating. Variables are wrapped in double curly brackets, e.g., {{title}}"
        id="template"
        title="Template"
        onChange={setTemplate}
        storeValue
        value={template}
      />
      <Form.Description
        title="Source Variables"
        text="author, category, cover_image_url, id, num_highlights, source, title"
      />
      <Form.Description
        title="Highlight Variables"
        text="color, id, location, note, text, updated"
      />
    </Form>
  )
}
