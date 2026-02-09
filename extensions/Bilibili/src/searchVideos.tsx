import { useSearchVideos } from "./hooks";
import { CheckLogin, VideoGridItem } from "./components";
import { formatNumber, removeEmHTMLTag } from "./utils";

import { useRef, useState } from "react";
import { Grid } from "@raycast/api";

export default function Command() {
  const [idx, setIdx] = useState(1);
  const [keyword, setKeyword] = useState("apple");
  const selectedIdsRef = useRef(new Set<string>());

  const { videoResults, isLoading } = useSearchVideos(idx, keyword);

  return (
    <CheckLogin>
      <Grid
        columns={2}
        aspectRatio="16/9"
        fit={Grid.Fit.Fill}
        inset={Grid.Inset.Zero}
        onSearchTextChange={(text) => {
          setKeyword(text);
          setIdx(1);
          selectedIdsRef.current.clear();
        }}
        isLoading={isLoading}
        onSelectionChange={(id) => {
          if (!id || selectedIdsRef.current.has(id)) return;

          selectedIdsRef.current.add(id);
          if (selectedIdsRef.current.size % 20 === 0) setIdx((current) => current + 1);
        }}
      >
        {videoResults?.map((item) => {
          return (
            <VideoGridItem
              key={`${item.bvid}-${item.cid}-${item.pubdate}`}
              id={`${item.bvid}-${item.cid}-${item.pubdate}`}
              title={removeEmHTMLTag(item.title)}
              cover={item.pic}
              desc={item.desc}
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
          );
        })}
      </Grid>
    </CheckLogin>
  );
}
