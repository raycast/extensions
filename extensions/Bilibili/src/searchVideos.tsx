import { useSearchVideos } from "./hooks";
import { CheckLogin, Video } from "./components";
import { formatNumber, removeEmHTMLTag } from "./utils";

import { useState } from "react";
import { List } from "@raycast/api";

export default function Command() {
  const [idx, setIdx] = useState(1);
  const [keyword, setKeyword] = useState("apple");
  const [countSet, setCountSet] = useState(new Set<string | undefined>([]));

  const { videoResults, isLoading } = useSearchVideos(idx, keyword);

  return (
    <CheckLogin>
      <List
        onSearchTextChange={(text) => {
          setKeyword(text);
          setIdx(1);
        }}
        isLoading={isLoading}
        isShowingDetail={true}
        onSelectionChange={(id) => {
          setCountSet(countSet.add(id || ""));

          if (countSet.size % 20 === 0) setIdx(idx + 1);
        }}
      >
        {videoResults?.map((item) => {
          return (
            <Video
              title={removeEmHTMLTag(item.title)}
              cover={item.pic}
              url={item.arcurl}
              bvid={item.bvid}
              cid={item.cid}
              uploader={{
                mid: item.mid,
                name: item.author,
                face: item.upic,
              }}
              duration={item.duration}
              pubdate={item.pubdate}
              stat={{
                view: formatNumber(item.play),
                danmaku: formatNumber(item.danmaku),
                like: formatNumber(item.like),
              }}
            />
          )
        })}
      </List>
    </CheckLogin>
  );
}
