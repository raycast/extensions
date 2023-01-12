import { useDynamicFeed } from "./hooks";
import { checkLogin, formatUrl } from "./utils";
import { NoLoginView, Video, Post } from "./components";

import { List } from "@raycast/api";

export default function Command() {
  if (!checkLogin()) return <NoLoginView />;

  const { dynamicItems, isLoading } = useDynamicFeed();

  return (
    <List enableFiltering={false} isLoading={isLoading} isShowingDetail={true}>
      {dynamicItems?.map((item) => {
        switch (item.type) {
          case "DYNAMIC_TYPE_AV":
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
                type={item.type}
              />
            );
          case "DYNAMIC_TYPE_MUSIC":
            return (
              <Post
                title={item.modules.module_dynamic.major.music.title}
                desc={item.modules.module_dynamic.desc.text}
                pubdate={item.modules.module_author.pub_ts}
                url={formatUrl(item.modules.module_dynamic.major.music.jump_url)}
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
                type={item.type}
              />
            );
          case "DYNAMIC_TYPE_LIVE_RCMD":
            // eslint-disable-next-line no-case-declarations
            const liveDate = JSON.parse(item.modules.module_dynamic.major.live_rcmd.content);

            return (
              <Post
                title={liveDate.live_play_info.title}
                desc={liveDate.live_play_info.title}
                pubdate={item.modules.module_author.pub_ts}
                url={formatUrl(liveDate.live_play_info.link)}
                cover={formatUrl(liveDate.live_play_info.cover)}
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
                type={item.type}
              />
            );
        }
      })}
    </List>
  );
}
