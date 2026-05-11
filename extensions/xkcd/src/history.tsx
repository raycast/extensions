import { Action, ActionPanel, List } from "@raycast/api";
import { useCallback, useRef, useState } from "react";
import { useAtom } from "jotai";
import { historyAtom } from "./atoms";
import { useCurrentSelectedComic } from "./xkcd";
import OpenComicInBrowser from "./open_in_browser";
import ExplainXkcd from "./explain_xkcd";

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HistoryView() {
  const [history] = useAtom(historyAtom);
  const [selectedNum, setSelectedNum] = useState<number>(-1);
  const [currentComic, loadingComic] = useCurrentSelectedComic(selectedNum);
  const selectedId = useRef<string | undefined>(undefined);

  const onSelectionChange = useCallback((id: string | undefined) => {
    if (!id || selectedId.current === id) return;
    selectedId.current = id;
    const num = Number(id);
    if (!isNaN(num)) setSelectedNum(num);
  }, []);

  const detail = (
    <List.Item.Detail
      isLoading={loadingComic}
      markdown={
        currentComic && !loadingComic
          ? `# ${currentComic.title} - #${currentComic.num}\n\n${currentComic.alt}\n\n![${currentComic.alt}](${currentComic.img})`
          : undefined
      }
    />
  );

  return (
    <List onSelectionChange={onSelectionChange} isShowingDetail navigationTitle="History">
      {history.length === 0 ? (
        <List.EmptyView title="No History Yet" description="Comics you view will appear here." />
      ) : (
        history.map((entry) => (
          <List.Item
            id={entry.num.toString()}
            key={entry.num}
            title={`Comic #${entry.num}`}
            accessories={[{ text: relativeTime(entry.viewedAt) }]}
            detail={detail}
            actions={
              <ActionPanel>
                <OpenComicInBrowser comic={entry.num} />
                <ExplainXkcd comic={entry.num} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
