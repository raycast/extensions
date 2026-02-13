import { useCachedPromise } from "@raycast/utils";
import { fizzy } from "./fizzy";
import { Board } from "./types";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

export default function Cards({ board }: { board: Board }) {
  const { isLoading, data: cards } = useCachedPromise((boardId: string) => fizzy.cards.list(boardId), [board.id], {
    initialData: [],
  });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {cards.map((card) => (
        <List.Item
          key={card.id}
          icon={Icon[`Number${String(card.number).padStart(2, "0")}` as keyof typeof Icon] || Icon.List}
          title={card.title}
          detail={<List.Item.Detail markdown={card.description} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={card.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
