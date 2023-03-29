import { FC } from 'react'
import { Detail } from '@raycast/api'
import { withConfig } from '../../utils/configurationCenter'

export const ApiHub: FC = withConfig(() => {
  return <Detail markdown="Hello Api hub"></Detail>
})
