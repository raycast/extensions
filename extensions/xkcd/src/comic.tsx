import { ActionPanel, Detail, OpenInBrowserAction, setLocalStorageItem } from "@raycast/api";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { lastViewedAtom, maxNumAtom, readStatusAtom } from "./atoms";
import OpenComic, { OpenRandomComic, OpenRandomUnreadComic } from "./open_comic";
import { BASE_URL, Comic, fetchComic } from "./xkcd";

const ComicPage = ({ num }: { num: number }) => {
  const [comicData, setComicData] = useState<Comic | null>(null);
  const [maxNum] = useAtom(maxNumAtom);
  const [readStatus, setReadStatus] = useAtom(readStatusAtom);
  const [, setLastViewed] = useAtom(lastViewedAtom);
  useEffect(() => {
    (async () => {
      const data = await fetchComic(num);
      setComicData(data);
      await setLocalStorageItem(`read:comic:${num}`, true);
      await setLocalStorageItem("last_viewed", num);
      setReadStatus({ ...readStatus, [num]: true });
      setLastViewed(num);
    })();
  }, [num]);
  if (comicData === null) return <Detail isLoading />;
  const markdownString = `
# ${comicData.title} - #${comicData.num}

![${comicData.alt}](${comicData.img})

${comicData.alt}
`;
  return (
    <Detail
      markdown={markdownString}
      actions={
        <ActionPanel>
          <OpenInBrowserAction
            icon={{ source: { light: "globe.png", dark: "globe@dark.png" } }}
            url={`${BASE_URL}/${num}/`}
          />
          <OpenRandomUnreadComic />
          <OpenRandomComic shortcut={{ key: "j", modifiers: ["cmd"] }} />
          {num !== 1 && (
            <OpenComic
              icon={{ source: { light: "arrow-left.png", dark: "arrow-left@dark.png" } }}
              num={num - 1}
              title="Previous Comic"
              shortcut={{ key: "h", modifiers: ["cmd"] }}
            />
          )}
          {num !== maxNum && (
            <OpenComic
              icon={{ source: { light: "arrow-right.png", dark: "arrow-right@dark.png" } }}
              num={num + 1}
              title="Next Comic"
              shortcut={{ key: "l", modifiers: ["cmd"] }}
            />
          )}
        </ActionPanel>
      }
    />
  );
};
export default ComicPage;
