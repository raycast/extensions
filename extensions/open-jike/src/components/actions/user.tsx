import React from 'react'
import { Action, ActionPanel, Icon } from '@raycast/api'
import { Login } from '../../views/login'
import { OpenInBrowser } from './common'

export const OpenProfile: React.FC<{
  username: string
  split?: boolean
}> = ({ username, split = true }) => {
  const macOS = (
    <OpenInBrowser
      key="open-macos"
      title={split ? '打开用户页 (macOS App)' : 'macOS App'}
      icon="📲"
      url={`jike://page.jk/user/${username}`}
    />
  )
  const pc = (
    <OpenInBrowser
      key="open-pc"
      title="PC Web 端"
      url={`https://web.okjike.com/u/${username}`}
    />
  )
  const mobile = (
    <OpenInBrowser
      key="open-mobile"
      title="手机 Web 端"
      url={`https://m.okjike.com/users/${username}`}
    />
  )
  return split ? (
    <>
      {macOS}
      <ActionPanel.Submenu
        key="openWith"
        title="打开用户页 (其他客户端)"
        icon={Icon.Window}
      >
        {pc}
        {mobile}
      </ActionPanel.Submenu>
    </>
  ) : (
    <>
      {macOS}
      {pc}
      {mobile}
    </>
  )
}

export const LoginNewUser: React.FC = () => (
  <Action.Push
    key="login"
    title="登录新用户"
    target={<Login />}
    icon={Icon.Plus}
    shortcut={{ modifiers: ['cmd'], key: 'n' }}
  />
)
