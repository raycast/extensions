import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { CardImageLanguage, getDefaultCardImageLanguage } from "../preferences";
import { Card, CardDetailViewProps, CardSlot } from "../types/types";
import { getLocalCardData } from "../utils/utils";

export function CardDetailView({
  slot = {},
  card = null,
  language = "enUS",
}: CardDetailViewProps) {
  const safeSlot: CardSlot = {
    card: {
      name: slot?.card?.name || "Unknown",
      cost: slot?.card?.cost ?? 0,
      collectible: slot?.card?.collectible ?? false,
      rarity: slot?.card?.rarity || "Unknown",
      id: slot?.card?.id || "",
      dbfId: slot?.card?.dbfId || 0,
      mana: slot?.card?.mana ?? 0,
    },
    amount: slot?.amount ?? 1,
  };

  const [safeCard, setSafeCard] = useState<Card>({
    name: card?.name || safeSlot.card.name,
    cost: card?.cost ?? safeSlot.card.cost,
    cardClass: card?.cardClass || "NEUTRAL",
    collectible: card?.collectible ?? false,
    id: card?.id || safeSlot.card.id || "",
    dbfId: card?.dbfId || safeSlot.card.dbfId || 0,
    mana: card?.mana || safeSlot.card.mana || 0,
    attack: card?.attack || 0,
    health: card?.health || 0,
    mechanics: card?.mechanics || [],
    rarity: card?.rarity || safeSlot.card.rarity,
    text: card?.text || "",
    flavor: card?.flavor || "",
    type: card?.type || "",
    set: card?.set || "",
    elite: card?.elite || false,
    faction: card?.faction || "",
  });

  const [cardImageLanguage, setCardImageLanguage] = useState<CardImageLanguage>(
    language === "enUS" ? CardImageLanguage.ENGLISH : CardImageLanguage.CHINESE,
  );

  // Adding independent state for UI language
  const [uiLanguage, setUiLanguage] = useState<"enUS" | "zhCN">(
    language === "enUS" ? "enUS" : "zhCN",
  );

  // Re-fetch card data when the card language changes
  useEffect(() => {
    const fetchCardData = async () => {
      try {
        if (safeCard.id) {
          const allCards = await getLocalCardData(
            cardImageLanguage === CardImageLanguage.ENGLISH ? "enUS" : "zhCN",
          );
          const updatedCard = allCards.find(
            (c: Card) => c.id === safeCard.id || c.dbfId === safeCard.dbfId,
          );
          if (updatedCard) {
            setSafeCard({
              ...safeCard,
              name: updatedCard.name || safeCard.name,
              text: updatedCard.text || safeCard.text,
              flavor: updatedCard.flavor || safeCard.flavor,
              type: updatedCard.type || safeCard.type,
              set: updatedCard.set || safeCard.set,
              rarity: updatedCard.rarity || safeCard.rarity,
              faction: updatedCard.faction || safeCard.faction,
              mechanics: updatedCard.mechanics || safeCard.mechanics,
            });
          }
        }
      } catch (error) {
        showFailureToast("Failed to fetch card data");
      }
    };
    fetchCardData();
  }, [cardImageLanguage]);

  // useEffect(() => {
  //   const defaultLanguage = getDefaultCardImageLanguage();
  //   setCardImageLanguage(defaultLanguage);
  //   setUiLanguage(defaultLanguage === CardImageLanguage.ENGLISH ? 'enUS' : 'zhCN');
  // }, []);

  useEffect(() => {
    const defaultLanguage = getDefaultCardImageLanguage();
    setCardImageLanguage(defaultLanguage);
  }, []);
  // const cardId = safeCard.id
  // const dbfId = safeCard.dbfId.toString()
  const cardName = safeCard.name;
  const cost = safeCard.cost;
  // const flavor = safeCard.flavor
  // const set = safeCard.set
  // const type = safeCard.type
  // const attack = safeCard.attack
  // const health = safeCard.health
  // const elite = safeCard.elite ? 'Yes' : 'No'
  // const faction = safeCard.faction || 'None'
  // const mechanics = safeCard.mechanics?.length > 0 ? safeCard.mechanics.join(', ') : 'None'
  // const rarity = safeCard.rarity

  const cardClass = safeCard.cardClass?.toUpperCase() || "NEUTRAL";

  const classNameMap: Record<string, string> = {
    DEATHKNIGHT: "Death Knight",
    DEMONHUNTER: "Demon Hunter",
    DRUID: "Druid",
    HUNTER: "Hunter",
    MAGE: "Mage",
    NEUTRAL: "Neutral",
    PALADIN: "Paladin",
    PRIEST: "Priest",
    ROGUE: "Rogue",
    SHAMAN: "Shaman",
    WARLOCK: "Warlock",
    WARRIOR: "Warrior",
  };

  const classNameMapCN: Record<string, string> = {
    DEATHKNIGHT: "死亡骑士",
    DEMONHUNTER: "恶魔猎手",
    DRUID: "德鲁伊",
    HUNTER: "猎人",
    MAGE: "法师",
    NEUTRAL: "中立",
    PALADIN: "圣骑士",
    PRIEST: "牧师",
    ROGUE: "潜行者",
    SHAMAN: "萨满祭司",
    WARLOCK: "术士",
    WARRIOR: "战士",
  };

  const uiTranslations: Record<string, Record<string, string>> = {
    enUS: {
      "Card Name": "Card Name",
      "Card ID": "Card ID",
      "DBF ID": "DBF ID",
      Type: "Type",
      Set: "Set",
      Rarity: "Rarity",
      Elite: "Elite",
      Faction: "Faction",
      Mechanics: "Mechanics",
      Class: "Class",
      "Mana Cost": "Mana Cost",
      Collectible: "Collectible",
      "Card Language": "Card Language",
      Yes: "Yes",
      No: "No",
      English: "English",
      Chinese: "Chinese",
      None: "None",
      "Card Text": "Card Text",
      "Flavor Text": "Flavor Text",
    },
    zhCN: {
      "Card Name": "卡牌名称",
      "Card ID": "卡牌ID",
      "DBF ID": "数据库ID",
      Type: "类型",
      Set: "系列",
      Rarity: "稀有度",
      Elite: "精英",
      Faction: "阵营",
      Mechanics: "机制",
      Class: "职业",
      "Mana Cost": "法力值消耗",
      Collectible: "可收集",
      "Card Language": "卡牌语言",
      Yes: "是",
      No: "否",
      English: "英文",
      Chinese: "中文",
      None: "无",
      "Card Text": "卡牌文本",
      "Flavor Text": "风味文本",
    },
  };

  const t = (key: string): string => {
    return uiTranslations[uiLanguage][key] || key;
  };

  const classSymbolMap: Record<string, string> = {
    DEATHKNIGHT: "✠",
    DEMONHUNTER: "☠",
    DRUID: "⍟",
    HUNTER: "⍉",
    MAGE: "∗",
    NEUTRAL: "○",
    PALADIN: "⛨",
    PRIEST: "✙",
    ROGUE: "⚔",
    SHAMAN: "☸︎",
    WARLOCK: "⏣",
    WARRIOR: "⊗",
  };

  const imageUrl = safeCard.id
    ? `https://art.hearthstonejson.com/v1/render/latest/${
        cardImageLanguage === CardImageLanguage.ENGLISH ? "enUS" : "zhCN"
      }/256x/${safeCard.id.replace(/^CORE_/, "")}.png`
    : null;

  const toggleCardImageLanguage = () => {
    setCardImageLanguage(
      cardImageLanguage === CardImageLanguage.ENGLISH
        ? CardImageLanguage.CHINESE
        : CardImageLanguage.ENGLISH,
    );
    setUiLanguage(
      cardImageLanguage === CardImageLanguage.ENGLISH ? "zhCN" : "enUS",
    );
  };

  // const toggleUILanguage = () => {
  //   setUiLanguage(uiLanguage === 'enUS' ? 'zhCN' : 'enUS')
  // }
  const markdown = `
${imageUrl ? `![${cardName}](${imageUrl})` : "*Card image not found*"}

${safeCard.flavor ? `> ${safeCard.flavor}` : ""}
  `;
  // 在 card-detail-view.tsx 文件中

  return (
    <Detail
      markdown={markdown}
      // Note: Keep it in English here and do not use the translation function t()
      navigationTitle={`Card Details`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={t("Card Name")} text={cardName} />
          {/*          <Detail.Metadata.Label title={t('Card ID')} text={cardId} />
          <Detail.Metadata.Label title={t('DBF ID')} text={dbfId} />*/}
          {/*          <Detail.Metadata.Label title={t('Type')} text={type} />
          <Detail.Metadata.Label title={t('Set')} text={set} />
          <Detail.Metadata.Label title={t('Rarity')} text={rarity} />
          <Detail.Metadata.Label title={t('Elite')} text={t(elite)} />
          <Detail.Metadata.Label title={t('Faction')} text={faction} />
          <Detail.Metadata.Label title={t('Mechanics')} text={mechanics} />*/}
          <Detail.Metadata.Label
            title={t("Class")}
            text={`${classSymbolMap[cardClass] || "⚬"}  ${
              uiLanguage === "enUS"
                ? classNameMap[cardClass] || cardClass
                : classNameMapCN[cardClass] || cardClass
            }`}
          />
          <Detail.Metadata.Label title={t("Mana Cost")} text={`♦  ${cost}`} />
          <Detail.Metadata.Label
            title={t("Collectible")}
            text={safeCard.collectible ? t("Yes") : t("No")}
          />
          <Detail.Metadata.Label
            title={t("Card Language")}
            text={
              cardImageLanguage === CardImageLanguage.ENGLISH
                ? t("English")
                : t("Chinese")
            }
            icon={{ source: Icon.Globe }}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            // The button text is fixed in English and does not change with the language
            title={
              cardImageLanguage === CardImageLanguage.ENGLISH
                ? "Switch to Chinese Card"
                : "Switch to English Card"
            }
            icon={Icon.Globe}
            onAction={toggleCardImageLanguage}
          />
          {/*          <Action
            // The button text is fixed in English and does not change with the language
            title={uiLanguage === 'enUS' ? 'Switch to Chinese UI' : 'Switch to English UI'}
            icon={Icon.Text}
            onAction={toggleUILanguage}
          />*/}
          <Action.OpenInBrowser
            url="https://hearthstone.blizzard.com/en-us/cards"
            title="Hearthstone Card Database 🇺🇲"
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
          <Action.OpenInBrowser
            url="https://hs.blizzard.cn/cards"
            title="Hearthstone Card Database 🇨🇳"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
