import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { returnBoards } from "./utils/fetchBoards";
import { Board } from "./Board";
import { getDefaultOpenTarget, toTrelloAppUrl } from "./utils/openInTrello";

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

  const appFirst = getDefaultOpenTarget() === "app";
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
            const openWebAction = (
              <Action.OpenInBrowser title="Open on Trello Web" icon={Icon.Globe} url={board.shortUrl} />
            );
            const openAppAction = (
              <Action.Open
                title="Open in Trello Desktop"
                icon={Icon.AppWindow}
                target={toTrelloAppUrl(board.shortUrl)}
              />
            );
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
                    {appFirst ? openAppAction : openWebAction}
                    {appFirst ? openWebAction : openAppAction}
                    <Action.CopyToClipboard title="Copy URL" content={board.shortUrl} />
                  </ActionPanel>
                }
              />
            );
          })
        : null}
    </List>
  );
}
