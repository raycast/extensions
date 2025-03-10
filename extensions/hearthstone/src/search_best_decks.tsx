import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { gethsguruBestDecks } from './hsguru'
import { classIcon, ellipsize, formatNumberWithK, getLocalCardData, type Card } from './utils' // 新增类型导入

// 新增类型定义
interface CardSlot {
  amount: number
  card: {
    title: string
    mana: number
  }
}

export default function Command() {
  const [format, setFormat] = useState(1)
  const { data: decks, isLoading: decksLoading } = usePromise(gethsguruBestDecks, [format])

  // 修改点：替换 any[]
  const [cardData, setCardData] = useState<Card[]>([])
  const [cardsLoading, setCardsLoading] = useState(true)

  useEffect(() => {
    const loadCardData = async () => {
      try {
        let data = await getLocalCardData()

        if (!data || data.length === 0) {
          console.log('Fetching card data from API...')
          const response = await axios.get('https://api.hearthstonejson.com/v1/latest/enUS/cards.json')
          data = response.data
        }

        setCardData(data as Card[]) // 类型断言
      } catch (error) {
        console.error('Error loading card data:', error)
      } finally {
        setCardsLoading(false)
      }
    }

    loadCardData()
  }, [])

  const isLoading = decksLoading || cardsLoading

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Select Format" onChange={(value) => setFormat(Number(value))}>
          <List.Dropdown.Section title="Game Mode">
            <List.Dropdown.Item title="Wild" value="1" />
            <List.Dropdown.Item title="Standard" value="2" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {decks?.map((deck) => (
        <List.Item
          key={deck.code}
          icon={classIcon(deck.className)}
          title={ellipsize(deck.title, 10)}
          accessories={[
            { icon: Icon.LineChart, text: `${deck.winrate}%`, tooltip: 'winrate' },
            { icon: Icon.Raindrop, text: formatNumberWithK(deck.dust), tooltip: 'dust' },
          ]}
          actions={
            <ActionPanel title={deck.title}>
              <ActionPanel.Section>
                <Action.CopyToClipboard content={deck.code} title="Copy Deck Code" />
                <Action.OpenInBrowser url={`https://www.hsguru.com/decks?format=${format}`} />
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={generateMarkdownList(deck.title, deck.slots as CardSlot[], cardData)} />}
        />
      ))}
    </List>
  )
}

// 修改点：替换 any[] 为具体类型
const generateMarkdownList = (title: string, cardSlots: CardSlot[], cardData: Card[]): string => {
  let markdown = `# ${title}\n\n`

  cardSlots.forEach((slot) => {
    let card = cardData.find((c) => c.name?.toLowerCase() === slot.card.title.toLowerCase())

    if (!card) {
      card = cardData.find(
        (c) =>
          c.name &&
          slot.card.title &&
          (c.name.toLowerCase().includes(slot.card.title.toLowerCase()) ||
            slot.card.title.toLowerCase().includes(c.name.toLowerCase())),
      )
    }

    if (card?.id) {
      const cardId = card.id
      const cardName = card.name || slot.card.title

      markdown += `${slot.amount}🃏  ${slot.card.mana}💎  ${cardName}\n\n`
      markdown += `<img src="https://art.hearthstonejson.com/v1/render/latest/enUS/256x/${cardId}.png" alt="${cardName}">\n`
    } else {
      markdown += `- ${slot.amount}🃏  ${slot.card.mana}💎  ${slot.card.title} (Card image not found)\n\n`
    }
  })

  return markdown
}
