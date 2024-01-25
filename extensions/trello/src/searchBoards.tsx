import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { returnBoards } from "./utils/fetchBoards";
import { Board } from "./Board";

export default function BoardsList() {
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    returnBoards().then((response) => {
      const sortedBoards = response
        .filter((a) => !a.closed)
        .sort(
          (a, b) => new Date(a.dateLastActivity).getMilliseconds() - new Date(b.dateLastActivity).getMilliseconds(),
        );
      setAllBoards(sortedBoards);
      setBoards(sortedBoards);
      setLoading(false);
    });
  }, []);

  const onSearchTextChange = (text: string) => {
    setBoards(allBoards.filter((x) => x.name.toLowerCase().includes(text.toLowerCase())));
    setLoading(false);
  };
  return (
    <List
      isShowingDetail={false}
      isLoading={loading}
      searchBarPlaceholder={`Search boards`}
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {boards?.length > 0
        ? boards.map((board) => {
            return (
              <List.Item
                icon={board.prefs.backgroundImageScaled ? board.prefs.backgroundImageScaled[0].url : ""}
                key={board.id}
                title={board.name}
                subtitle={board.organization?.displayName}
                detail={
                  <List.Item.Detail
                    markdown={`# [${board.name}](${board.shortUrl})
![Illustration](${board.prefs.backgroundImageScaled ? board.prefs.backgroundImageScaled[2].url : ""})`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={board.shortUrl} />
                  </ActionPanel>
                }
              />
            );
          })
        : null}
    </List>
  );
}
