import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from '@raycast/api'
import { useAuth } from '../use-auth'

export const Authenticated = ({
  component: Component,
}: {
  component: React.ComponentType
}) => {
  const { data: user, isLoading, error } = useAuth()

  const markdown = error?.message.includes('Invalid login credentials')
    ? error.message + '. Please open the preferences and try again.'
    : error?.message

  if (user) {
    return <Component />
  }

  if (isLoading) {
    return <Detail isLoading />
  }

  if (error) {
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
}
