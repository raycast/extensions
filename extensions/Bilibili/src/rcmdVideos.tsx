import { useRcmdVideos } from "./hooks";
import { CheckLogin, Video } from "./components";
import { formatNumber, secondToDate } from "./utils";

import { useState } from "react";
import { List } from "@raycast/api";

export default function Command() {
  const [idx, setIdx] = useState(1);
  const [countSet, setCountSet] = useState(new Set<string | undefined>([]));

  const { rcmdVideos, isLoading } = useRcmdVideos(idx);

  return (
    <CheckLogin>
      <List
        filtering={false}
        isLoading={isLoading}
        isShowingDetail={true}
        onSelectionChange={(id) => {
          setCountSet(countSet.add(id || ""));

          if (countSet.size % 16 === 0) setIdx(idx + 1);
        }}
      >
        {rcmdVideos?.map((item) => (
          <Video
            title={item.title}
            cover={item.pic}
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
      </List>
    </CheckLogin>
  );
}
