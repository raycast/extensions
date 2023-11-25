import { useDynamicFeed } from "./hooks";
import { checkLogin, formatUrl } from "./utils";
import { NoLoginView, Post, Video } from "./components";
import { List } from "@raycast/api";
import { useState } from "react";

type KindType = { id: string; name: string };

function DrinkDropdown(props: { kindTypes: KindType[]; onKindTypeChange: (newValue: string) => void }) {
  const { kindTypes, onKindTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Filter Options"
      storeValue={true}
      onChange={(newValue) => {
        onKindTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Filter Options">
        {kindTypes.map((kindType) => (
          <List.Dropdown.Item key={kindType.id} title={kindType.name} value={kindType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  if (!checkLogin()) return <NoLoginView />;

  const [filterType, setFilterType] = useState("");
  const { dynamicItems, isLoading } = useDynamicFeed();

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

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarAccessory={<DrinkDropdown kindTypes={kindTypes} onKindTypeChange={onKindTypeChange} />}
    >
      {dynamicItems
        ?.filter((item: Bilibili.DynamicItem) => filterMap[filterType as keyof typeof filterMap](item))
        .map((item) => {
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
                  url={`https://www.bilibili.com/opus/${item.id_str}`}
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
