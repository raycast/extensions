import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { searchGames, GameResponse } from "./api";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [games, setGames] = useState<GameResponse[]>([]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setGames([]);
      return;
    }

    setIsLoading(true);
    try {
      const gameList = await searchGames(query);
      setGames(gameList);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "搜索失败",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List isLoading={isLoading} onSearchTextChange={handleSearch} searchBarPlaceholder="输入游戏名称搜索...">
      {games.map((game) => (
        <List.Item
          key={game.id}
          icon={Icon.GameController}
          title={game.name}
          accessories={[{ text: game.id }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Game Id" content={game.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
