import {
  loadHasDoneToday,
  loadTodayCoin,
  storeTodayCoin,
} from '@/services/storage'
import { ActionPanel, List } from '@raycast/api'
import { useEffect, useState } from 'react'
import { OpenNotionAction } from './open-notion-action'
import { WhatHaveIDoneAction } from './what-have-i-done-action'

type EmptyListProps = {
  notionDbUrl: string
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

export function EmptyList({ notionDbUrl }: EmptyListProps) {
  const [coin, setCoin] = useState('')

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

  return (
    <List.EmptyView
      icon={{
        source: { light: coin || light, dark: coin || dark },
      }}
      actions={
        <ActionPanel>
          <WhatHaveIDoneAction />
          <OpenNotionAction notionDbUrl={notionDbUrl} />
        </ActionPanel>
      }
    />
  )
}
