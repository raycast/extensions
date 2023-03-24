import React, { FC } from 'react'
import { Action, ActionPanel, List, useNavigation } from '@raycast/api'

import { InitOauth } from './InitGoogleOauth'

const Oauth: FC = () => {
  const { push } = useNavigation()

  return (
    <List>
      <List.Item
        title="Init Google OAuth"
        actions={
          <ActionPanel>
            <Action title="Init Google OAuth" onAction={() => push(<InitOauth />)} />
          </ActionPanel>
        }
      ></List.Item>

      <List.Item
        title="Remove Google OAuth"
        actions={
          <ActionPanel title="Remove Google OAuth">
            <Action.OpenInBrowser url="https://myaccount.google.com/permissions?continue=https%3A%2F%2Fmyaccount.google.com%2Fsecurity" />
          </ActionPanel>
        }
      ></List.Item>
    </List>
  )
}

export { Oauth }
