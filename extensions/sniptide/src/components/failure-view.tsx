import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api"
import { describe } from "../lib/errors"
import { messages } from "../lib/messages"

// The empty state of a list that couldn't load, with the fix when the preferences hold it.
export function FailureView({ error }: { error: unknown }) {
  const failure = describe(error)
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={messages.failed}
      description={failure.message}
      actions={
        failure.preferences ? (
          <ActionPanel>
            <Action
              icon={Icon.Gear}
              title={messages.openPreferences}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  )
}
