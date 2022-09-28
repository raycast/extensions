import { Action, Icon } from '@raycast/api'
import { DoneWork } from './done-work-detail'

export function WhatHaveIDoneAction() {
  return (
    <Action.Push
      icon={Icon.Eye}
      title="Share Your Work"
      target={<DoneWork />}
      shortcut={{ modifiers: ['cmd'], key: 't' }}
    />
  )
}
