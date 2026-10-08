import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from '@raycast/api'
import { useAuth } from '../use-auth'
import type { ReactNode } from 'react'

export const Authenticated = ({ children }: { children: ReactNode }) => {
  const { data: user, isLoading, error } = useAuth()

  if (isLoading) {
    return <Detail isLoading />
  }

  if (error || !user) {
    const markdown = `### Error: ${error?.name}\n\n${error?.message}`
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    )
  }

  return children
}
