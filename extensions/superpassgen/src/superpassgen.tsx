import { useState } from 'react'
import {
  Form,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  closeMainWindow,
  popToRoot,
} from '@raycast/api'

import { generatePassword } from './generatePassword'

type ActionType = 'copy' | 'paste'

export default function Command() {
  const [masterPassword, setMasterPassword] = useState('')
  const [domain, setDomain] = useState('')

  async function onActionHandler(type: ActionType) {
    try {
      const password = await generatePassword(masterPassword, domain)
      await (type === 'copy' ? Clipboard.copy : Clipboard.paste)(password)
      await popToRoot()
      await closeMainWindow()
    } catch (error) {
      if (error instanceof Error) {
        await showToast({
          title: 'Unhandled exception has occurred',
          message: error.message ?? '',
          style: Toast.Style.Failure,
        })
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Paste password"
            onAction={() => onActionHandler('paste')}
          ></Action>
          <Action
            title="Copy password"
            onAction={() => onActionHandler('copy')}
          ></Action>
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="password"
        title="Master password"
        onChange={setMasterPassword}
      />
      <Form.TextField id="domain" title="Domain / URL" onChange={setDomain} />
    </Form>
  )
}
