import { ActionPanel, allLocalStorageItems, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { maxNum } from "./xkcd";
import { OpenComic, OpenRandomComic, OpenRandomUnreadComic } from "./open_comic";
import { useAtom } from "jotai";
import { lastViewedAtom, maxNumAtom, readStatusAtom, totalReadAtom } from "./atoms";

export default function main() {
  const [num, setNum] = useAtom(maxNumAtom);
  const [readStatus, setReadStatus] = useAtom(readStatusAtom);
  const [loading, setLoading] = useState(true);
  const [totalRead] = useAtom(totalReadAtom);
  const [lastViewed, setLastViewed] = useAtom(lastViewedAtom);
  useEffect(() => {
    (async () => {
      const data = await maxNum();
      setNum(data);
      const items = await allLocalStorageItems();
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
    <List>
      <List.Section title="Commands">
        {totalRead < num && (
          <List.Item
            title="Random Unread"
            subtitle=" Read a random unread xkcd comic."
            actions={
              <ActionPanel>
                <OpenRandomUnreadComic />
              </ActionPanel>
            }
          />
        )}
        <List.Item
          title="Random"
          subtitle="Read a random xkcd comic."
          actions={
            <ActionPanel>
              <OpenRandomComic />
            </ActionPanel>
          }
        />
        {lastViewed > 0 && (
          <List.Item
            title="Last Viewed"
            subtitle="Pick up where you left off!"
            actions={
              <ActionPanel>
                <OpenComic num={lastViewed} />
              </ActionPanel>
            }
          />
        )}
        <List.Item
          title="Latest"
          subtitle="View the latest xkcd comic."
          actions={
            <ActionPanel>
              <OpenComic num={num} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="xkcd Comics" subtitle={`${totalRead} read out of ${num}`}>
        {[...Array(num)].map((_, idx) => (
          <List.Item
            key={num - idx}
            title={`Comic #${num - idx}`}
            keywords={[num - idx + ""]}
            actions={
              <ActionPanel>
                <OpenComic num={num - idx} />
              </ActionPanel>
            }
            accessoryIcon={readStatus[num - idx] ? undefined : { source: Icon.Dot, tintColor: Color.Blue }}
            accessoryTitle={readStatus[num - idx] ? "" : "unread"}
          />
        ))}
      </List.Section>
    </List>
  );
}
