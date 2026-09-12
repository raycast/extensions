import { OpenPreferencesAction } from '@/components/open-preferences-action'
import { Action, ActionPanel, Icon, openCommandPreferences } from '@raycast/api'
import { OpenNotionAction } from './open-notion-action'
import { ReauthorizeAction } from './reauthorize-action'
import { WhatHaveIDoneAction } from './what-have-i-done-action'

export function GeneralActions({
  mutatePreferences,
  notionDbUrl,
}: {
  mutatePreferences: () => void
  notionDbUrl: string
}) {
  return (
    <ActionPanel.Section>
      <WhatHaveIDoneAction />
      <OpenNotionAction notionDbUrl={notionDbUrl} />
      <ReauthorizeAction />
      <OpenPreferencesAction revalidate={mutatePreferences} />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openCommandPreferences}
        shortcut={{ modifiers: ['cmd'], key: ',' }}
      />
      <Action.OpenInBrowser
        title="Drop us a Line"
        icon={Icon.Heart}
        url={'https://twitter.com/rebootstudio_'}
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'm' }}
      />
    </ActionPanel.Section>
  )
}
