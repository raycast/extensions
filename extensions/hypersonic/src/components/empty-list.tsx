import { templateUrl } from '@/constants/template-url'
import {
  loadHasDoneToday,
  loadTodayCoin,
  storeTodayCoin,
} from '@/services/storage'
import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  openCommandPreferences,
} from '@raycast/api'
import { useEffect, useMemo, useState } from 'react'
import { OpenNotionAction } from './open-notion-action'
import { ReauthorizeAction } from './reauthorize-action'
import { WhatHaveIDoneAction } from './what-have-i-done-action'

type EmptyListProps = {
  notionDbUrl: string
  getInitialData: () => void
}

const dark = 'empty-dark.gif'
const light = 'empty-light.gif'

const COINS = [
  '001.gif',
  '002.gif',
  '003.gif',
  '004.gif',
  '005.gif',
  '006.gif',
  '007.gif',
  '008.gif',
  '009.gif',
  '010.gif',
  '011.gif',
  '012.gif',
  '013.gif',
  '014.gif',
  '015.gif',
  '016.gif',
  '017.gif',
  '018.gif',
  'x-02.gif',
]

async function getCoin(): Promise<string> {
  let coin = await loadTodayCoin()

  if (coin) {
    return coin as string
  }

  const randomIndex = Math.floor(Math.random() * COINS.length)
  coin = COINS[randomIndex]
  await storeTodayCoin(coin)

  return coin
}

export function EmptyList({ notionDbUrl, getInitialData }: EmptyListProps) {
  const [coin, setCoin] = useState('')
  const databaseName = useMemo(() => getPreferenceValues().database_name, [])

  const handleStart = async () => {
    const someDone = await loadHasDoneToday()

    if (someDone) {
      const coin = await getCoin()
      setCoin(`https://hypersonic.run/img/coins/${coin}`)
    }
  }

  useEffect(() => {
    handleStart()
  }, [])

  if (!notionDbUrl) {
    return (
      <List.EmptyView
        title={`We couldn't find ${databaseName} database.`}
        description="Make sure to duplicate the template (⌘ + U) and grant permission (⌘ + S)"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Link"
              icon={Icon.Link}
              url={templateUrl}
              shortcut={{ modifiers: ['cmd'], key: 'u' }}
            />
            <ReauthorizeAction getInitialData={getInitialData} />
          </ActionPanel>
        }
      />
    )
  }

  return (
    <List.EmptyView
      icon={{
        source: { light: coin || light, dark: coin || dark },
      }}
      actions={
        <ActionPanel>
          <WhatHaveIDoneAction />
          <ReauthorizeAction />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openCommandPreferences}
            shortcut={{ modifiers: ['cmd'], key: ',' }}
          />
          <OpenNotionAction notionDbUrl={notionDbUrl} />
        </ActionPanel>
      }
    />
  )
}
