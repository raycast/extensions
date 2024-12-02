import { useState } from "react";
import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import listData from "./cardsdb.json";
import packsData from "./packsdb.json";

type Card = {
  ID: string;
  Pack: string;
  Name: string;
  Img: string;
  Rarity: string;
};

type Pack = {
  Name: string;
  Expansion: string;
  Img: string;
  Icon: string;
};

export default function Command() {
  const [selectedPack, setSelectedPack] = useState<string | null>(null);

  const allCards: Card[] = listData;
  const allPacks: Pack[] = packsData;

  const filteredCards = selectedPack
    ? selectedPack === "All Cards"
      ? allCards
      : allCards.filter((card) => card.Pack === selectedPack)
    : [];

  return (
    <List
      searchBarPlaceholder="Search for packs and cards..."
      isShowingDetail={true}
      navigationTitle={selectedPack ? selectedPack : "All Packs"}
    >
      {selectedPack === null
        ? [
            <List.Item
              key="all-cards"
              title="All Cards"
              icon="pack-icon.png"
              detail={<List.Item.Detail markdown="Browse all cards in the game." />}
              actions={
                <ActionPanel>
                  <Action title="View All Cards" icon="cards.png" onAction={() => setSelectedPack("All Cards")} />
                </ActionPanel>
              }
            />,
            ...allPacks.map((pack) => (
              <List.Item
                key={pack.Name}
                title={pack.Name}
                subtitle={pack.Expansion}
                icon={pack.Icon}
                detail={<List.Item.Detail markdown={`<img src="${pack.Img}" width="175" height="350" />`} />}
                actions={
                  <ActionPanel>
                    <Action title="View Cards" icon="cards.png" onAction={() => setSelectedPack(pack.Name)} />
                  </ActionPanel>
                }
              />
            )),
          ]
        : filteredCards.map((card) => (
            <List.Item
              key={card.ID}
              title={card.Name}
              accessoryTitle={card.Rarity}
              subtitle={card.ID} // Add this line to display the ID on the opposite side
              detail={
                <List.Item.Detail markdown={`<img src="${card.Img}" alt="${card.Name}" width="250" height="348" />`} />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="How to Get"
                    icon="shop.png"
                    onAction={() =>
                      showToast({
                        style: Toast.Style.Success,
                        title: `${card.Name}`,
                        message: `${card.Pack}`,
                      })
                    }
                  />
                  <Action title="Back to Packs" icon="pack-icon.png" onAction={() => setSelectedPack(null)} />
                </ActionPanel>
              }
            />
          ))}
    </List>
  );
}
