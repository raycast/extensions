// CardDetailView.tsx
import { Action, ActionPanel, Detail, Icon } from '@raycast/api'
import { CardSlot } from './domain'
import { getRarityColor } from './utils'

interface CardData {
  id?: string
  name?: string
  cost?: number
  rarity?: string
  type?: string
  // 添加其他可能需要的卡牌属性
}

interface CardDetailViewProps {
  slot: CardSlot
  card: CardData | null // 使用明确的类型，并允许为 null
  deckCode: string
}

export function CardDetailView({ slot, card }: CardDetailViewProps) {
  const cardId = card?.id
  const cardName = card?.name || slot.card.title
  const mana = slot.card.mana
  const amount = slot.amount
  const rarity = slot.card.rarity || 'Unknown'
  const rarityColor = getRarityColor(rarity)
  
  const imageUrl = cardId 
    ? `https://art.hearthstonejson.com/v1/render/latest/enUS/256x/${cardId}.png` 
    : null
  
  // 使用原始的 generateMarkdownList 风格
  const markdown = `
# ${cardName}

${imageUrl ? `![${cardName}](${imageUrl})` : "*Card image not found*"}
  `
  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${cardName} Details`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Card Name" text={cardName} />
          <Detail.Metadata.Label title="Mana Cost" text={`💎  ${mana}`} />
          <Detail.Metadata.Label 
            title="Rarity" 
            text={rarity} 
            icon={{ source: Icon.CircleFilled, tintColor: rarityColor }}
          />
          <Detail.Metadata.Label title="Amount in Deck" text={`🃏  ${amount}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser 
            url={`https://hearthstone.blizzard.com/en-us/cards`} 
            title="Hearthstone Card Database" 
          />
        </ActionPanel>
      }
    />
  )
}
