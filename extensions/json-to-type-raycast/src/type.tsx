import React, { useEffect, useState } from 'react'
import { Action, ActionPanel, Form, Icon, Toast, showToast } from '@raycast/api'

import { json2ts } from 'json-ts'

export default function Command() {
  const [jsonInput, setJsonInput] = useState<string | undefined>('')
  const [jsonResult, setJsonResult] = useState<string | undefined>('')

  useEffect(() => {
    if (!jsonInput) return

    try {
      setJsonResult('')
      const json = JSON.parse(jsonInput.replace(/'/g, '"'))

      const type = json2ts(JSON.stringify(json), {
        prefix: '',
        rootName: 'MyType',
      })
      setJsonResult(type)
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: 'Is not a valid JSON',
        message: jsonInput,
      })
    }
  }, [jsonInput])

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy JSON"
              content={jsonResult || ''}
              icon={Icon.CopyClipboard}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea id={'JSON'} title={'JSON'} onChange={setJsonInput} />
      {jsonResult && (
        <Form.TextArea id={'Type'} title={'Type'} value={jsonResult} />
      )}
    </Form>
  )
}
