import { video } from "./components";
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
      // enableFiltering={false}
      isLoading={isLoading}
      isShowingDetail={true}
      onSelectionChange={(id) => {
        if (!countList.includes(id || "")) countList.push(id || "");

        if (countList.length % 20 === 0) setIdx(idx + 1);
      }}
    >
      {rcmdVideos?.map((item) =>
        video(
          item.title,
          item.pic,
          item.uri,
          {
            mid: item.owner.mid,
            name: item.owner.name,
            face: item.owner.face,
          },
          secondToDate(item.duration),
          item.pubdate,
          {
            highlight: item.rcmd_reason?.content || undefined,
            view: item.stat?.view ? formatNumber(item.stat.view) : undefined,
            danmaku: item.stat?.danmaku ? formatNumber(item.stat.danmaku) : undefined,
            coin: item.stat?.coin ? formatNumber(item.stat.coin) : undefined,
            like: item.stat?.like ? formatNumber(item.stat.like) : undefined,
          }
        )
      )}
    </List>
  );
}
