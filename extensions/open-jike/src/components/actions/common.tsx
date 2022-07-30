import { Action, showHUD } from '@raycast/api'
import React from 'react'

export const OpenInBrowser: React.FC<Action.OpenInBrowser.Props> = (props) => (
  <Action.OpenInBrowser onOpen={() => showHUD('已打开')} {...props} />
)
