import React, { FC } from 'react'
import { List } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import { getGoogleOAuthToken, getOAuthClient } from '../../utils/googleOauthClient'
const InitOauth: FC = () => {
  const { data: token } = usePromise(getGoogleOAuthToken, [])

  return (
    <List>
      {token && <List.Item title="认证完成" />}
      {!token && <List.Item title="认证中....." />}
    </List>
  )
}

export { InitOauth }
