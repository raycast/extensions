import { NoLoginView, Video } from "./components";
import { checkLogin } from "./utils";
import { useDynamicFeed } from "./hooks";

import { List } from "@raycast/api";
import { Post } from "./components/post";

export default function Command() {
  if (!checkLogin()) return <NoLoginView />;

  const { dynamicItems, isLoading } = useDynamicFeed();

  return (
    <List enableFiltering={false} isLoading={isLoading} isShowingDetail={true}>
      {dynamicItems?.map((item) => {
        switch (item.type) {
          case "DYNAMIC_TYPE_AV":
            item = item as Bilibili.dynmamicVideo;

            return (
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
            );
          case "DYNAMIC_TYPE_FORWARD":
          case "DYNAMIC_TYPE_WORD":
          case "DYNAMIC_TYPE_DRAW":
            item = item as Bilibili.dynamicPost;

            return (
              <Post
                desc={item.modules.module_dynamic.desc.text}
                pubdate={item.modules.module_author.pub_ts}
                url={`https://t.bilibili.com/${item.id_str}`}
                uploader={{
                  mid: item.modules.module_author.mid,
                  name: item.modules.module_author.name,
                  face: item.modules.module_author.face,
                }}
                stat={{
                  comment: item.modules.module_stat.comment.count,
                  forward: item.modules.module_stat.forward.count,
                  like: item.modules.module_stat.like.count,
                }}
              />
            );
        }
      })}
    </List>
  );
}
