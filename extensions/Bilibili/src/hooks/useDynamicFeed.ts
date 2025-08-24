import { getDynamicFeed, getPlayUrl, getVideoInfo } from "../apis";

import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export function useDynamicFeed() {
  const [dynamicItems, setDynamicItems] = useState<Bilibili.DynamicItems>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRefetch, refetch] = useState({});
  const [watchedList, setWatchedList] = useCachedState<Array<string>>("watchedList", []);

  useEffect(() => {
    (async () => {
      try {
        const res = await getDynamicFeed();

        const dynamicList = await Promise.all(
          res.map(async (item: Bilibili.DynamicItem) => {
            if (item.type !== "DYNAMIC_TYPE_AV") return item;

            const { aid } = item.modules.module_dynamic.major.archive;
            const videoInfo = await getVideoInfo(aid);
            const videoPlayUrl = await getPlayUrl(videoInfo.bvid, videoInfo.cid.toString());

            // save played video aid into watchedList
            if (videoPlayUrl.last_play_time && !watchedList.includes(videoInfo.bvid)) {
              setWatchedList([videoInfo.bvid, ...watchedList].slice(0, 200));
            }

            item.modules.module_dynamic.major.archive.last_play_time =
              videoPlayUrl.last_play_time || +watchedList.includes(videoInfo.bvid);

            return item;
          })
        );

        setDynamicItems(dynamicList);
        setIsLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get dynamic video feed failed");
      }
    })();
  }, [shouldRefetch]);

  return { dynamicItems, isLoading, refetch };
}
