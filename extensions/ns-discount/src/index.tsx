import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchDiscountList } from "./api";
import { IGame } from "./model";
import PriceList from "./PriceList";

export default function Command() {
  const [gameList, setGameList] = useState<IGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gameList.length === 0) {
      getFetchedData().then((val) => {
        setGameList(val);
      });
    }
  });

  const getFetchedData = async (offset?: number) => {
    try {
      const res = await fetchDiscountList(offset);
      setLoading(false);
      return res.games;
    } catch (error) {
      setLoading(false);
      showToast(Toast.Style.Failure, "Failed to fetch discount list");
      return [];
    }
  };

  const onSelectionChange = async (id: string | undefined) => {
    const selectionIndex = gameList.findIndex((val) => val.appid === id);

    if (
      !!selectionIndex &&
      (gameList.length >= 4 ? selectionIndex === gameList.length - 4 : selectionIndex === gameList.length - 1)
    ) {
      const games = await getFetchedData(gameList.length);
      setGameList((current) => [...current, ...games]);
    }
  };

  return (
    <List isLoading={loading} onSelectionChange={onSelectionChange}>
      {gameList.map((game) => {
        return (
          <List.Item
            id={game.appid}
            key={game.appid}
            title={game.titleZh}
            subtitle={game.title}
            icon={{ source: game.icon }}
            accessories={[{ text: `${game.cutoff} OFF` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Features">
                  <Action.Push title="View Price List" target={<PriceList game={game} />} icon={{ source: Icon.Eye }} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          ></List.Item>
        );
      })}
    </List>
  );
}
