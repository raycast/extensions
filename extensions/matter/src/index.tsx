import { List, Image, Icon } from "@raycast/api";
import { useState } from "react";
import { Actions } from "./components/Actions";
import { FavoritesDropdown } from "./components/FavoritesDropdown";
import { getQueue, getFavorites } from "./matterApi";
import TokenErrorHandle from "./components/TokenErrorHandle";
import { ErrorResponse, FeedType, Item, Items } from "./types";
import { showFailureToast, usePromise } from "@raycast/utils";

export default function Command() {
  const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
  const [filter, setFilter] = useState<FeedType>(FeedType.Queue);

  const {
    isLoading,
    data: items,
    pagination,
  } = usePromise(
    (feedType: FeedType) => async (options) => {
      let result: Items | ErrorResponse;
      if (feedType === FeedType.Queue) {
        result = await getQueue(options.page + 1);
      } else {
        // If filter is set to favorites, get favorites instead
        result = await getFavorites(options.page + 1);
      }
      if ("detail" in result) throw new Error(result.detail);
      setIsTokenValid(true);
      return {
        data: result.feed,
        hasMore: !!result.next,
      };
    },
    [filter],
    {
      async onError(error) {
        if (error.message === "Given token not valid for any token type")
          await showFailureToast("Please check your token in preferences", { title: "Token not valid" });
        else showFailureToast(error, { title: "Error fetching articles" });
      },
    }
  );

  function getArticleThumbnail(item: Item) {
    if (item.content.photo_thumbnail_url) {
      return item.content.photo_thumbnail_url;
    } else if (item.content.publisher.domain_photo) {
      return item.content.publisher.domain_photo;
    } else {
      return "";
    }
  }

  function filterSelection(type: FeedType) {
    setFilter(type);
  }

  return (
    <>
      {isTokenValid || isLoading ? (
        <List
          isLoading={isLoading}
          searchBarAccessory={<FavoritesDropdown filterSelection={filterSelection} />}
          pagination={pagination}
        >
          {items?.map((item) => {
            const accessories: List.Item.Accessory[] = [];
            if (item.content.library.is_favorited) accessories.push({ icon: Icon.Star });
            if (item.content.article?.word_count)
              accessories.push({ text: `${item.content.article.word_count} words` });
            if (item.content.article?.reading_time_minutes)
              accessories.push({ text: `${item.content.article.reading_time_minutes}min` });
            return (
              <List.Item
                key={item.id}
                icon={{
                  source: getArticleThumbnail(item),
                  mask: Image.Mask.Circle,
                }}
                title={item.content.title}
                actions={<Actions item={item} />}
                accessories={accessories}
              />
            );
          })}
        </List>
      ) : (
        <TokenErrorHandle></TokenErrorHandle>
      )}
    </>
  );
}
