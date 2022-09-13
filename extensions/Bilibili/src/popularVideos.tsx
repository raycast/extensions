import { video } from "./components";
import { usePopularVideos } from "./hooks";

import { Color, List, Icon, Cache } from "@raycast/api";

export default function Command() {
  const cache = new Cache();
  if (!cache.has("cookie"))
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

  const { popularVideos, isLoading } = usePopularVideos();

  return (
    <List enableFiltering={false} isLoading={isLoading} isShowingDetail={true}>
      {popularVideos?.map((item) =>
        video(
          item.title,
          item.pic,
          item.short_link,
          {
            mid: item.owner.mid,
            name: item.owner.name,
            face: item.owner.face,
          },
          item.duration,
          item.pubdate,
          {
            highlight: item.rcmd_reason.content,
            view: item.stat.view,
            danmaku: item.stat.danmaku,
            coin: item.stat.coin,
            like: item.stat.like,
          }
        )
      )}
    </List>
  );
}
