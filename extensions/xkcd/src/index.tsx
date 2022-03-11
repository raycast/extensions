import { Action, ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchComic, maxNum } from "./xkcd";
import { useAtom } from "jotai";
import { currentComicAtom, lastViewedAtom, maxNumAtom, readStatusAtom, totalReadAtom } from "./atoms";
import getRandomUnread from "./get_random_unread";
import OpenComicInBrowser from "./open_in_browser";

export default function main() {
  const [num, setNum] = useAtom(maxNumAtom);
  const [readStatus, setReadStatus] = useAtom(readStatusAtom);
  const [loading, setLoading] = useState(true);
  const [totalRead] = useAtom(totalReadAtom);
  const [lastViewed, setLastViewed] = useAtom(lastViewedAtom);
  const [currentComic, setCurrentComic] = useAtom(currentComicAtom);
  const [selectedId, setSelectedId] = useState("");
  const [markdownString, setMarkdownString] = useState<string | null>(null);
  useEffect(() => {
    if (currentComic === -1) return;
    setMarkdownString(null);
    (async () => {
      const data = await fetchComic(currentComic);
      setMarkdownString(`
# ${data.title} - #${data.num}

${data.alt}

![${data.alt}](${data.img})`);
      await LocalStorage.setItem(`read:comic:${currentComic}`, true);
      await LocalStorage.setItem("last_viewed", currentComic);
      setReadStatus({ ...readStatus, [currentComic]: true });
      setLastViewed(currentComic);
    })();
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

  if (loading) return <List isLoading />;
  return (
    <List
      onSelectionChange={(id) => {
        if (!id || id === selectedId) return;
        setSelectedId(id);
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
      }}
      isShowingDetail={true}
    >
      <List.Section title="Commands">
        {lastViewed > 0 && (
          <List.Item
            id="last-viewed"
            title="Last Viewed"
            subtitle="Pick up where you left off!"
            detail={
              <List.Item.Detail
                isLoading={markdownString === null}
                markdown={markdownString === null ? undefined : markdownString}
              />
            }
            actions={
              <ActionPanel>
                <OpenComicInBrowser />
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
                  title="Random Unread"
                  onAction={() => {
                    setCurrentComic(getRandomUnread(readStatus, num));
                  }}
                />
                <OpenComicInBrowser />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                isLoading={markdownString === null}
                markdown={markdownString === null ? undefined : markdownString}
              />
            }
          />
        )}
        <List.Item
          id="random"
          title="Random"
          subtitle="Read a random xkcd comic."
          actions={
            <ActionPanel>
              <Action
                title="Random"
                onAction={() => {
                  setCurrentComic(Math.floor(Math.random() * num + 1));
                }}
              />
              <OpenComicInBrowser />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              isLoading={markdownString === null}
              markdown={markdownString === null ? undefined : markdownString}
            />
          }
        />
        <List.Item
          id="latest"
          title="Latest"
          subtitle="View the latest xkcd comic."
          detail={
            <List.Item.Detail
              isLoading={markdownString === null}
              markdown={markdownString === null ? undefined : markdownString}
            />
          }
          actions={
            <ActionPanel>
              <OpenComicInBrowser />
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
            detail={
              <List.Item.Detail
                isLoading={markdownString === null}
                markdown={markdownString === null ? undefined : markdownString}
              />
            }
            accessoryIcon={readStatus[num - idx] ? undefined : { source: Icon.Dot, tintColor: Color.Blue }}
            accessoryTitle={readStatus[num - idx] ? "" : "unread"}
            actions={
              <ActionPanel>
                <OpenComicInBrowser />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
