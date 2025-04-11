import { formatUrl } from "./utils";
import { useDynamicFeed } from "./hooks";
import { getVideoInfo, postHeartbeat } from "./apis";
import { CheckLogin, Post, Video } from "./components";

import { useState } from "react";
import { useCachedState } from "@raycast/utils";
import { List, showToast, Toast } from "@raycast/api";

type KindType = { id: string; name: string };

function FilterDropdown(props: { kindTypes: KindType[]; onKindTypeChange: (newValue: string) => void }) {
  const { kindTypes, onKindTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Drink Type"
      storeValue={true}
      onChange={(newValue) => {
        onKindTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Alcoholic Beverages">
        {kindTypes.map((kindType) => (
          <List.Dropdown.Item key={kindType.id} title={kindType.name} value={kindType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [filterType, setFilterType] = useState("");
  const { dynamicItems, isLoading, refetch } = useDynamicFeed();
  const [watchedList, setWatchedList] = useCachedState<Array<string>>("watchedList", []);

  const videoTypes = ["DYNAMIC_TYPE_LIVE_RCMD", "DYNAMIC_TYPE_AV"];

  const kindTypes: KindType[] = [
    { id: "0", name: "All" },
    { id: "1", name: "Unwatched Videos" },
    { id: "2", name: "Watched Videos" },
    { id: "3", name: "Videos" },
  ];

  const filterMap = {
    "0": (_item: Bilibili.DynamicItem) => true,
    "1": (item: Bilibili.DynamicItem) =>
      item.type === "DYNAMIC_TYPE_AV" ? item.modules.module_dynamic.major.archive.last_play_time === 0 : false,
    "2": (item: Bilibili.DynamicItem) =>
      item.type === "DYNAMIC_TYPE_AV" ? item.modules.module_dynamic.major.archive.last_play_time !== 0 : false,
    "3": (item: Bilibili.DynamicItem) => videoTypes.includes(item.type),
  };
  const onKindTypeChange = (newValue: string) => {
    setFilterType(newValue);
  };

  const dynamicComponentSelector = (item: Bilibili.DynamicItem) => {
    const { pub_ts, mid, name, face } = item.modules.module_author;

    const isPost = (item: Bilibili.DynamicItem): item is Bilibili.DynamicPost => {
      return ["DYNAMIC_TYPE_FORWARD", "DYNAMIC_TYPE_WORD", "DYNAMIC_TYPE_DRAW"].includes(item.type);
    };

    if (item.type === "DYNAMIC_TYPE_AV") {
      const { aid, title, cover, jump_url, bvid, duration_text, badge, stat, last_play_time } =
        item.modules.module_dynamic.major.archive;

      return (
        <Video
          title={title}
          cover={cover}
          url={jump_url}
          bvid={bvid}
          uploader={{
            mid,
            name,
            face,
          }}
          duration={duration_text}
          pubdate={pub_ts}
          stat={{
            highlight: badge.text,
            view: stat.play,
            danmaku: stat.danmaku,
          }}
          onOpenCallback={() => {
            if (watchedList.includes(bvid)) return;

            setWatchedList([bvid, ...watchedList].slice(0, 200));
            refetch({});
          }}
          markAsWatchedCallback={
            last_play_time === 0
              ? async () => {
                  try {
                    const videoInfo = await getVideoInfo(aid);

                    await postHeartbeat(videoInfo.aid, videoInfo.cid);
                    if (!watchedList.includes(bvid)) setWatchedList([bvid, ...watchedList].slice(0, 200));

                    refetch({});
                    await showToast({ style: Toast.Style.Success, title: "Make as watched successfully" });
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Make as watched failed, please retry later",
                    });
                  }
                }
              : undefined
          }
        />
      );
    } else if (isPost(item)) {
      const { text } = item.modules.module_dynamic.desc;
      const { like, forward, comment } = item.modules.module_stat;

      return (
        <Post
          desc={text}
          pubdate={pub_ts}
          url={`https://www.bilibili.com/opus/${item.id_str}`}
          uploader={{
            mid,
            name,
            face,
          }}
          stat={{
            comment: comment.count,
            forward: forward.count,
            like: like.count,
          }}
          type={item.type}
        />
      );
    } else if (item.type === "DYNAMIC_TYPE_MUSIC") {
      const { major, desc } = item.modules.module_dynamic;
      const { like, forward, comment } = item.modules.module_stat;

      return (
        <Post
          title={major.music.title}
          desc={desc.text}
          pubdate={pub_ts}
          url={formatUrl(major.music.jump_url)}
          uploader={{
            mid,
            name,
            face,
          }}
          stat={{
            comment: comment.count,
            forward: forward.count,
            like: like.count,
          }}
          type={item.type}
        />
      );
    } else if (item.type === "DYNAMIC_TYPE_LIVE_RCMD") {
      const liveDate = JSON.parse(item.modules.module_dynamic.major.live_rcmd.content);
      const { like, forward, comment } = item.modules.module_stat;

      return (
        <Post
          title={liveDate.live_play_info.title}
          desc={liveDate.live_play_info.title}
          pubdate={pub_ts}
          url={formatUrl(liveDate.live_play_info.link)}
          cover={formatUrl(liveDate.live_play_info.cover)}
          uploader={{
            mid,
            name,
            face,
          }}
          stat={{
            comment: comment.count,
            forward: forward.count,
            like: like.count,
          }}
          type={item.type}
        />
      );
    }
  };

  return (
    <CheckLogin>
      <List
        filtering={false}
        isLoading={isLoading}
        isShowingDetail={true}
        searchBarAccessory={<FilterDropdown kindTypes={kindTypes} onKindTypeChange={onKindTypeChange} />}
      >
        {dynamicItems
          ?.filter((item: Bilibili.DynamicItem) => filterMap[filterType as keyof typeof filterMap](item))
          .map(dynamicComponentSelector)}
      </List>
    </CheckLogin>
  );
}
