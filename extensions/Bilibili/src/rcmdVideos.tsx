import { useRcmdVideos } from "./hooks";
import { CheckLogin, VideoGridItem } from "./components";
import { formatNumber, secondToDate } from "./utils";

import { useRef, useState } from "react";
import { Grid } from "@raycast/api";

export default function Command() {
  const [idx, setIdx] = useState(1);
  const selectedIdsRef = useRef(new Set<string>());

  const { rcmdVideos, isLoading } = useRcmdVideos(idx);

  return (
    <CheckLogin>
      <Grid
        columns={2}
        aspectRatio="16/9"
        fit={Grid.Fit.Fill}
        inset={Grid.Inset.Zero}
        isLoading={isLoading}
        onSelectionChange={(id) => {
          if (!id || selectedIdsRef.current.has(id)) return;

          selectedIdsRef.current.add(id);
          if (selectedIdsRef.current.size % 16 === 0) setIdx((current) => current + 1);
        }}
      >
        {rcmdVideos?.map((item) => (
          <VideoGridItem
            key={`${item.bvid}-${item.cid}-${item.pubdate}`}
            id={`${item.bvid}-${item.cid}-${item.pubdate}`}
            title={item.title}
            cover={item.pic}
            desc={item.desc}
            url={item.uri}
            bvid={item.bvid}
            cid={item.cid}
            uploader={{
              mid: item.owner.mid,
              name: item.owner.name,
              face: item.owner.face,
            }}
            duration={secondToDate(item.duration)}
            pubdate={item.pubdate}
            stat={{
              highlight: item.rcmd_reason?.content || undefined,
              view: formatNumber(item.stat?.view),
              danmaku: formatNumber(item.stat?.danmaku),
              coin: formatNumber(item.stat?.coin),
              like: formatNumber(item.stat?.like),
            }}
          />
        ))}
      </Grid>
    </CheckLogin>
  );
}
