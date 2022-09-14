import { Video } from "./components";
import { useRcmdVideos } from "./hooks";
import { checkLogin, formatNumber, secondToDate } from "./utils";

import { useState } from "react";
import { Color, List, Icon } from "@raycast/api";

export default function Command() {
  if (!checkLogin())
    return (
      <List>
        <List.EmptyView
          icon={{
            source: Icon.ExclamationMark,
            tintColor: Color.Red,
          }}
          title="Please use Login Bilibili command to login first."
        />
      </List>
    );

  const [idx, setIdx] = useState(1);
  const countList: string[] = [];

  const { rcmdVideos, isLoading } = useRcmdVideos(idx);

  return (
    <List
      enableFiltering={false}
      isLoading={isLoading}
      isShowingDetail={true}
      onSelectionChange={(id) => {
        if (!countList.includes(id || "")) countList.push(id || "");

        if (countList.length % 20 === 0) setIdx(idx + 1);
      }}
    >
      {rcmdVideos?.map((item) => (
        <Video
          title={item.title}
          cover={item.pic}
          url={item.uri}
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
  );
}
