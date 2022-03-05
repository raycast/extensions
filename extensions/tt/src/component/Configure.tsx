import { Action, ActionPanel, Form } from '@raycast/api'
import { FunctionComponent } from 'react'
import { useConfigure } from '../hook/useConfigure'
import { L } from '../constant'

export const Configure: FunctionComponent = () => {
  const { state, isLoading, onSubmit } = useConfigure()

  if (isLoading) {
    return null
  }
  return (
    <Form
      navigationTitle={L.Setting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={L.Save} onSubmit={onSubmit} />
          <Action.OpenInBrowser
            title={L.Issue_Papago_token}
            url="https://developers.naver.com/apps/#/register"
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={L.Papago}
        text={L.Issue_a_token_from_the_bottom_menu}
      />
      {Object.entries(ID_PLACEHOLDER_PAIR).map(([id, placeholder]) => (
        <Form.TextField
          key={id}
          id={id}
          title={id}
          placeholder={placeholder}
          defaultValue={state[id]}
        />
      ))}
      <Form.Separator />
    </Form>
  )
}

const ID_PLACEHOLDER_PAIR = {
  'X-Naver-Client-Id': 'xxxxxxxxxxxxxxxxxxxx',
  'X-Naver-Client-Secret': 'xxxxxxxxxx',
}
