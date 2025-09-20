import { Action, ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState, useRef } from "react";
import { useCurrentSelectedComic, maxNum } from "./xkcd";
import { useAtom } from "jotai";
import { currentComicAtom, lastViewedAtom, maxNumAtom, readStatusAtom, totalReadAtom } from "./atoms";
import getRandomUnread from "./get_random_unread";
import OpenComicInBrowser from "./open_in_browser";
import ExplainXkcd from "./explain_xkcd";

export default function main() {
  const [num, setNum] = useAtom(maxNumAtom);
  const [readStatus, setReadStatus] = useAtom(readStatusAtom);
  const [loading, setLoading] = useState(true);
  const [totalRead] = useAtom(totalReadAtom);
  const [lastViewed, setLastViewed] = useAtom(lastViewedAtom);
  const [currentComicNumber, setCurrentComic] = useAtom(currentComicAtom);
  const [currentComic, loadingComic] = useCurrentSelectedComic(currentComicNumber);
  const selectedId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!currentComic) {
      return;
    }
    LocalStorage.setItem(`read:comic:${currentComic.num}`, true);
    LocalStorage.setItem("last_viewed", currentComic.num);
    setReadStatus({ ...readStatus, [currentComic.num]: true });
    setLastViewed(currentComic.num);
  }, [currentComic]);

  useEffect(() => {
    (async () => {
      const data = await maxNum();
      setNum(data);
      const items = await LocalStorage.allItems();
      for (const [key, val] of Object.entries(items)) {
        if (key.startsWith("read:comic:")) {
          const comicNum = Number(key.slice("read:comic:".length));
          readStatus[comicNum] = val;
        } else if (key === "last_viewed") {
          setLastViewed(val);
        }
      }
      setReadStatus({ ...readStatus });
      setLoading(false);
    })();
  }, []);

  const onSelectionChange = useCallback(
    (id: string | undefined) => {
      if (!id || selectedId.current === id) {
        return;
      }

      selectedId.current = id;

      if (id === "random-unread") {
        setCurrentComic(getRandomUnread(readStatus, num));
      } else if (id === "random") {
        setCurrentComic(Math.floor(Math.random() * num + 1));
      } else if (id === "last-viewed") {
        setCurrentComic(lastViewed);
      } else if (id === "latest") {
        setCurrentComic(num);
      } else {
        const idNum = Number(id);

        if (!isNaN(idNum)) {
          setCurrentComic(idNum);
        }
      }
    },
    [setCurrentComic, lastViewed, readStatus, selectedId],
  );

  if (loading) return <List isLoading />;

  const detail = (
    <List.Item.Detail
      isLoading={loadingComic}
      markdown={
        currentComic && !loadingComic
          ? `
# ${currentComic.title} - #${currentComic.num}

${currentComic.alt}

![${currentComic.alt}](${currentComic.img})`
          : undefined
      }
    />
  );

  return (
    <List onSelectionChange={onSelectionChange} isShowingDetail>
      <List.Section title="Commands">
        {lastViewed > 0 && (
          <List.Item
            id="last-viewed"
            title="Last Viewed"
            subtitle="Pick up where you left off!"
            detail={detail}
            actions={
              <ActionPanel>
                <OpenComicInBrowser />
                <ExplainXkcd />
              </ActionPanel>
            }
          />
        )}
        {totalRead < num && (
          <List.Item
            id="random-unread"
            title="Random Unread"
            subtitle="Read a random unread xkcd comic."
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.TwoArrowsClockwise}
                  title="Random Unread"
                  onAction={() => {
                    setCurrentComic(getRandomUnread(readStatus, num));
                  }}
                />
                <OpenComicInBrowser />
                <ExplainXkcd />
              </ActionPanel>
            }
            detail={detail}
          />
        )}
        <List.Item
          id="random"
          title="Random"
          subtitle="Read a random xkcd comic."
          actions={
            <ActionPanel>
              <Action
                icon={Icon.TwoArrowsClockwise}
                title="Random"
                onAction={() => {
                  setCurrentComic(Math.floor(Math.random() * num + 1));
                }}
              />
              <OpenComicInBrowser />
              <ExplainXkcd />
            </ActionPanel>
          }
          detail={detail}
        />
        <List.Item
          id="latest"
          title="Latest"
          subtitle="View the latest xkcd comic."
          detail={detail}
          actions={
            <ActionPanel>
              <OpenComicInBrowser />
              <ExplainXkcd />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="xkcd Comics" subtitle={`${totalRead} read out of ${num}`}>
        {[...Array(num)].map((_, idx) => (
          <List.Item
            id={(num - idx).toString()}
            key={num - idx}
            title={`Comic #${num - idx}`}
            keywords={[num - idx + ""]}
            detail={detail}
            accessoryIcon={readStatus[num - idx] ? undefined : { source: Icon.Dot, tintColor: Color.Blue }}
            accessoryTitle={readStatus[num - idx] ? "" : "unread"}
            actions={
              <ActionPanel>
                <OpenComicInBrowser />
                <ExplainXkcd />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
