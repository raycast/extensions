import { Action, ActionPanel, Detail, Icon } from '@raycast/api'
import { useEffect, useState } from 'react'
import { CardSlot } from './domain'
import { CardImageLanguage, getDefaultCardImageLanguage } from './preferences'
import { getRarityColor } from './utils'

interface CardData {
  id?: string
  name?: string
  cost?: number
  rarity?: string
  type?: string
}

interface CardDetailViewProps {
  slot: CardSlot
  card: CardData | null
  deckCode: string
}

export function CardDetailView({ slot, card }: CardDetailViewProps) {
  const [cardImageLanguage, setCardImageLanguage] = useState<CardImageLanguage>(CardImageLanguage.ENGLISH)
  
  // 组件加载时获取默认卡牌图片语言设置
  useEffect(() => {
    const defaultLanguage = getDefaultCardImageLanguage()
    setCardImageLanguage(defaultLanguage)
    console.log("Using default card image language:", defaultLanguage)
  }, [])
  
  const cardId = card?.id
  const cardName = card?.name || slot.card.title
  const mana = slot.card.mana
  const amount = slot.amount
  const rarity = slot.card.rarity || 'Unknown'
  const rarityColor = getRarityColor(rarity)
  
  // 根据当前语言构建图片URL
  const imageUrl = cardId 
    ? `https://art.hearthstonejson.com/v1/render/latest/${cardImageLanguage}/256x/${cardId}.png` 
    : null
  
  // 切换图片语言的处理函数
  const toggleCardImageLanguage = () => {
    const newLanguage = cardImageLanguage === CardImageLanguage.ENGLISH 
      ? CardImageLanguage.CHINESE 
      : CardImageLanguage.ENGLISH
    setCardImageLanguage(newLanguage)
    console.log("Switched card image language to:", newLanguage)
  }
  
  // 判断当前是否使用中文图片
  const isChineseImage = cardImageLanguage === CardImageLanguage.CHINESE
  
  const markdown = `
${imageUrl ? `![${cardName}](${imageUrl})` : "*Card image not found*"}
  `
  
  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${cardName} Details`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Card Name" text={cardName} />
          <Detail.Metadata.Label title="Mana Cost" text={`[♦]  ${mana}`} />
          <Detail.Metadata.Label 
            title="Rarity" 
            text={rarity} 
            icon={{ source: Icon.CircleFilled, tintColor: rarityColor }}
          />
          <Detail.Metadata.Label title="Amount in Deck" text={`[♠]  ${amount}`} />
          <Detail.Metadata.Label 
            title="Card Language" 
            text={isChineseImage ? "Chinese" : "English"} 
            icon={{ source: Icon.Globe }}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action 
            title={isChineseImage ? "Switch to English Card" : "Switch to Chinese Card"}
            icon={Icon.Globe}
            onAction={toggleCardImageLanguage}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action.OpenInBrowser 
            url="https://hearthstone.blizzard.com/en-us/cards"
            title="Hearthstone Card Database (English)"
          />
          <Action.OpenInBrowser 
            url="https://hs.blizzard.cn/cards"
            title="Hearthstone Card Database (Chinese)"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  )
}
