import {
  Action,
  ActionPanel,
  Detail,
  openExtensionPreferences,
} from '@raycast/api'

type UnauthorisedProps = {
  authError: string
}
export const Unauthorised = ({ authError }: UnauthorisedProps) => {
  const markdown =
    authError === 'Invalid login credentials'
      ? authError + '. Please open the preferences and try again.'
      : authError

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  )
}
