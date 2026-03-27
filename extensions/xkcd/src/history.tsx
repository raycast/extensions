import { Action, ActionPanel, List } from "@raycast/api";
import { useCallback, useRef } from "react";
import { useAtom } from "jotai";
import { currentComicAtom, HistoryEntry } from "./atoms";
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

interface Props {
  history: HistoryEntry[];
}

export default function HistoryView({ history }: Props) {
  const [currentComicNumber, setCurrentComic] = useAtom(currentComicAtom);
  const [currentComic, loadingComic] = useCurrentSelectedComic(currentComicNumber);
  const selectedId = useRef<string | undefined>(undefined);

  const onSelectionChange = useCallback(
    (id: string | undefined) => {
      if (!id || selectedId.current === id) return;
      selectedId.current = id;
      const num = Number(id);
      if (!isNaN(num)) setCurrentComic(num);
    },
    [setCurrentComic],
  );

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
            accessoryTitle={relativeTime(entry.viewedAt)}
            detail={detail}
            actions={
              <ActionPanel>
                <OpenComicInBrowser />
                <ExplainXkcd />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
