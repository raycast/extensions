import { Action, ActionPanel, Form, Toast, showToast } from '@raycast/api'
import React, { useState } from 'react'

export interface AuthForm {
  areaCode: string
  mobile: string
  loginMethod: 'password' | 'smsCode'
  password: string
  smsCode: string
}

export interface FormAuthProps {
  onSendSMS: (form: Pick<AuthForm, 'areaCode' | 'mobile'>) => Promise<void>
  onLogin: (form: AuthForm) => Promise<string | undefined>
}

export const FormAuth: React.FC<FormAuthProps> = ({ onSendSMS, onLogin }) => {
  const [loginMethod, setLoginMethod] =
    useState<AuthForm['loginMethod']>('password')
  const [isSentSMS, setIsSentSMS] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const sendSMS = async (form: AuthForm) => {
    setIsLoading(true)

    await onSendSMS({
      areaCode: form.areaCode,
      mobile: form.mobile,
    }).finally(() => setIsLoading(false))

    setIsSentSMS(true)
    await showToast({
      title: '短信已发送',
      style: Toast.Style.Success,
    })
  }

  const login = async (form: AuthForm) => {
    // TODO: validate form

    setIsLoading(true)

    showToast({
      title: '登录中',
      style: Toast.Style.Animated,
    })

    const screenName = await onLogin(form).finally(() => setIsLoading(false))
    if (screenName)
      await showToast({
        title: '登录成功',
        message: `Hi, ${screenName}`,
        style: Toast.Style.Success,
      })
  }

  const actions = [
    <Action.SubmitForm key="login" title="Login" onSubmit={login} />,
  ]
  if (loginMethod === 'smsCode') {
    actions[isSentSMS ? 'push' : 'unshift'](
      <Action.SubmitForm
        key="sendSMS"
        title={isSentSMS ? 'Resend SMS' : 'Send SMS'}
        onSubmit={sendSMS}
      />
    )
  }
  return (
    <Form
      navigationTitle="认证信息"
      isLoading={isLoading}
      actions={<ActionPanel>{...actions}</ActionPanel>}
    >
      <Form.TextField
        id="areaCode"
        title="区号"
        placeholder="86"
        defaultValue="86"
      />
      <Form.TextField id="mobile" title="手机号" autoFocus />

      <Form.Separator />

      <Form.Dropdown
        id="loginMethod"
        title="认证方式"
        value={loginMethod}
        onChange={setLoginMethod as any}
      >
        <Form.Dropdown.Item value="password" title="登录密码" icon="🔑" />
        <Form.Dropdown.Item value="smsCode" title="短信验证码" icon="📲" />
      </Form.Dropdown>

      {loginMethod === 'password' && (
        <Form.PasswordField id="password" title="密码" />
      )}
      {loginMethod === 'smsCode' && (
        <Form.TextField id="smsCode" title="短信验证码" />
      )}
    </Form>
  )
}
