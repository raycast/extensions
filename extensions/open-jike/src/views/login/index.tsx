import React, { useMemo } from 'react'
import { popToRoot, useNavigation } from '@raycast/api'
import { JikeClient } from 'jike-sdk/index'
import { getUserIndex, toJSON } from '../../utils/user'
import { handleError } from '../../utils/errors'
import { useUsers } from '../../hooks/user'
import { FormEndpointInfo } from './form-endpoint-info'
import { FormAuth } from './form-auth'
import type { ConfigUser } from '../../utils/config'
import type { AuthForm } from './form-auth'
import type { EndpointInfo } from './form-endpoint-info'

export const Login: React.FC = () => {
  const { push } = useNavigation()

  return (
    <FormEndpointInfo onSubmit={(info) => push(<Auth endpointInfo={info} />)} />
  )
}

const Auth: React.FC<{ endpointInfo: EndpointInfo }> = ({ endpointInfo }) => {
  const client = useMemo(() => new JikeClient(endpointInfo), [endpointInfo])
  const { users, setUsers } = useUsers()

  const onLogin = async ({
    areaCode,
    mobile,
    loginMethod,
    password,
    smsCode,
  }: AuthForm) => {
    try {
      if (loginMethod === 'password') {
        await client.loginWithPassword(areaCode, mobile, password)
      } else {
        await client.loginWithSmsCode(areaCode, mobile, smsCode)
      }

      const user: ConfigUser = await toJSON(client)
      const idx = getUserIndex(users, user)
      if (idx > -1) {
        users[idx] = user
      } else {
        users.push(user)
      }
      setUsers(users)

      popToRoot()
      return user.screenName
    } catch (err) {
      handleError(err)
    }
  }

  return (
    <FormAuth
      onSendSMS={async ({ areaCode, mobile }) => {
        try {
          await client.sendSmsCode(areaCode, mobile)
        } catch (err) {
          handleError(err)
          return
        }
      }}
      onLogin={onLogin}
    />
  )
}
