import { useDynamicFeed } from "./hooks";

import { Color, List, Icon, Cache } from "@raycast/api";
import { video } from "./components";

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

  const { dynamicVideoFeed, isLoading } = useDynamicFeed();

  return (
    <List enableFiltering={false} isLoading={isLoading} isShowingDetail={true}>
      {dynamicVideoFeed?.map((item) =>
        video(
          item.modules.module_dynamic.major.archive.title,
          item.modules.module_dynamic.major.archive.cover,
          item.modules.module_dynamic.major.archive.jump_url,
          {
            name: item.modules.module_author.name,
            face: item.modules.module_author.face,
            mid: item.modules.module_author.mid,
          },
          item.modules.module_dynamic.major.archive.duration_text,
          item.modules.module_author.pub_ts,
          {
            highlight: item.modules.module_dynamic.major.archive.badge.text,
            view: item.modules.module_dynamic.major.archive.stat.play,
            danmaku: item.modules.module_dynamic.major.archive.stat.danmaku,
          }
        )
      )}
    </List>
  );
}
