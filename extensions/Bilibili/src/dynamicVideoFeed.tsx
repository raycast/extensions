import { NoLoginView, Video } from "./components";
import { checkLogin } from "./utils";
import { useDynamicFeed } from "./hooks";

import { List } from "@raycast/api";

export default function Command() {
  if (!checkLogin()) return <NoLoginView />;

  const { dynamicVideoFeed, isLoading } = useDynamicFeed();

  return (
    <List enableFiltering={false} isLoading={isLoading} isShowingDetail={true}>
      {dynamicVideoFeed?.map((item) => (
        <Video
          title={item.modules.module_dynamic.major.archive.title}
          cover={item.modules.module_dynamic.major.archive.cover}
          url={item.modules.module_dynamic.major.archive.jump_url}
          uploader={{
            name: item.modules.module_author.name,
            face: item.modules.module_author.face,
            mid: item.modules.module_author.mid,
          }}
          duration={item.modules.module_dynamic.major.archive.duration_text}
          pubdate={item.modules.module_author.pub_ts}
          stat={{
            highlight: item.modules.module_dynamic.major.archive.badge.text,
            view: item.modules.module_dynamic.major.archive.stat.play,
            danmaku: item.modules.module_dynamic.major.archive.stat.danmaku,
          }}
        />
      ))}
    </List>
  );
}
