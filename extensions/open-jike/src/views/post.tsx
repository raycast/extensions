import React, { useState } from 'react'
import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from '@raycast/api'
import { ApiOptions } from 'jike-sdk/index'
import { handleError } from '../utils/errors'
import { UserSelect } from '../components/user-select'
import { useUser, useUsers } from '../hooks/user'
import { NoUser } from './no-user'
import type { ConfigUser } from '../utils/config'

export const Post: React.FC = () => {
  const { pop } = useNavigation()
  const { noUser } = useUsers()
  const [user, setUser] = useState<ConfigUser>()
  const { client } = useUser(user)
  const [loading, setLoading] = useState(false)

  const submit = async ({ content }: { content: string }) => {
    if (!user) {
      await showToast({
        title: '请选择用户',
        style: Toast.Style.Failure,
      })
      return
    } else if (content.trim().length === 0) {
      await showToast({
        title: '内容不能为空',
        style: Toast.Style.Failure,
      })
      return
    }

    setLoading(true)
    try {
      await client!.createPost(ApiOptions.PostType.ORIGINAL, content)
    } catch (err) {
      handleError(err)
      return
    } finally {
      setLoading(false)
    }

    await showToast({
      title: '发送成功',
      style: Toast.Style.Success,
    })
    pop()
  }

  return !noUser ? (
    <Form
      isLoading={loading}
      navigationTitle="发布动态"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <UserSelect onChange={setUser} />

      <Form.TextArea
        id="content"
        title="内容"
        placeholder="请输入要发送的内容"
      />
    </Form>
  ) : (
    <NoUser />
  )
}
