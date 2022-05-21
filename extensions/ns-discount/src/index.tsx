import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { useEffect, useState } from 'react'
import { fetchDiscountList } from './api'
import { IGame } from './model'
import PriceList from './PriceList'
import { calcCutoff } from './utils'

export default function Command() {
  const [gameList, setGameList] = useState<IGame[]>([])

  useEffect(() => {
    try {
      gameList.length === 0 && fetchDiscountList().then(res => {
        setGameList(res.games)
      })
    }
    catch (error) {
      throw new Error('Failed to fetch discount list')
    }
  })

  return (
    <List>
      {
        gameList.map(game => {
          return (
            <List.Item
              id={game.appid}
              key={game.appid}
              title={game.titleZh}
              subtitle={game.title}
              icon={{ source: game.icon }}
              accessories={[{ text: `${calcCutoff(game.cutoff)}折` }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title='功能'>
                    <Action.Push
                      title="View Price List"
                      target={<PriceList game={game}/>}
                      icon={{ source: Icon.Eye }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            >
            </List.Item>
          )
        })
      }
    </List>
  )
}
