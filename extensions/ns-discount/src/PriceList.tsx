import { List } from '@raycast/api'
import { useEffect, useState } from 'react'
import { fetchGameDetail } from './api'
import { IGame, IGameInfo, IPrice } from './model'
import { calcCutoff } from './utils'

export default function PriceList({ game }: {game: IGame}) {
  const [prices, setPrices] = useState<IPrice[]>([])
  const [gameInfo, setGameInfo] = useState<IGameInfo>()
  const [showPrices, setShowPrices] = useState<IPrice[]>([])

  useEffect(() => {
    try {
      prices.length === 0 && fetchGameDetail(game.appid).then(res => {
        setGameInfo(res.game)
        setPrices(res.prices)
        setShowPrices(res.prices)
      })
    }
    catch (error) {
      throw new Error('Failed to fetch game detail')
    }
  })

  const onSearchTextChanged = (text: string) => {
    if (text.length === 0) {
      setShowPrices(prices)
    }
    else {
      setShowPrices(prices.filter(price => price.country.includes(text)))
    }
  }

  return (
    <List onSearchTextChange={onSearchTextChanged}>
      <List.Item
        key="date"
        title="截止日期"
        accessories={[{ text: game.leftDiscount.replace('天', ' 天') }]}
      />
      <List.Section title='价格表'>
        {
          showPrices.map(price => {
            return (
              <List.Item
                key={price.country}
                title={price.country}
                accessories={[
                  { text: `${price.cutoff ? (`【${calcCutoff(price.cutoff)} 折】 - `) : ''}${price.price.toString()} 元` },
                ]}
              />
            )
          })
        }
      </List.Section>
    </List>
  )
}
