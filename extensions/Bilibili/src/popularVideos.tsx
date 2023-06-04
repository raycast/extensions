import { usePopularVideos } from "./hooks";
import { NoLoginView, Video } from "./components";
import { checkLogin, formatNumber, secondToDate } from "./utils";

import { useState } from "react";
import { List } from "@raycast/api";

export default function Command() {
  if (!checkLogin()) return <NoLoginView />;

  const [pn, setPn] = useState(1);
  const [countSet, setCountSet] = useState(new Set<string | undefined>([]));

  const { popularVideos, isLoading } = usePopularVideos(pn);

  return (
    <List
      enableFiltering={false}
      isLoading={isLoading}
      isShowingDetail={true}
      onSelectionChange={(id) => {
        if (!id) return;

        setCountSet(countSet.add(id));

        if (countSet.size % 20 === 0) setPn(pn + 1);
      }}
    >
      {popularVideos?.map((item) => (
        <Video
          title={item.title}
          cover={item.pic}
          url={item.short_link || item.short_link_v2}
          uploader={{
            mid: item.owner.mid,
            name: item.owner.name,
            face: item.owner.face,
          }}
          duration={secondToDate(item.duration)}
          pubdate={item.pubdate}
          stat={{
            highlight: item.rcmd_reason.content,
            view: formatNumber(item.stat.view),
            danmaku: formatNumber(item.stat.danmaku),
            coin: formatNumber(item.stat.coin),
            like: formatNumber(item.stat.like),
          }}
        />
      ))}
    </List>
  );
}
