import { List, showToast, Toast, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { Actions } from "./components/Actions";
import { FavoritesDropdown } from "./components/FavoritesDropdown";
import { getQueue, getFavorites } from "./matterApi";
import TokenErrorHandle from "./components/TokenErrorHandle";
import { Item, Items } from "./types";

interface State {
  items?: any;
  error?: Error;
}

export default function Command() {
  const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
  const [state, setState] = useState<State>({});
  // 1 = queue, 2 = favorites
  const [filter, setFilter] = useState<any>(1);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  async function fetchQueue() {
    setLoading(true);
    try {
      let items: Items;
      if (filter == 1) {
        items = (await getQueue()) as Items;
      } else {
        // If filter is set to favorites, get favorites instead
        items = (await getFavorites()) as Items;
      }
      if (items.code == "token_not_valid") {
        showToast(Toast.Style.Failure, "Token not valid", "Please check your token in preferences");
        setLoading(false);
        return;
      }
      setIsTokenValid(true);
      setState({ items });
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setState({
        error: error instanceof Error ? error : new Error("Something went wrong with fetching the articles"),
      });
    }
  }

  function getArticleThumbnail(item: Item) {
    if (item.content.photo_thumbnail_url) {
      return item.content.photo_thumbnail_url;
    } else if (item.content.publisher.domain_photo) {
      return item.content.publisher.domain_photo;
    } else {
      return "";
    }
  }

  function filterSelection(type: any) {
    setFilter(type);
  }

  return (
    <>
      {isTokenValid || loading ? (
        <List isLoading={loading} searchBarAccessory={<FavoritesDropdown filterSelection={filterSelection} />}>
          {state
            ? state.items?.feed.map((item: any) => (
                <List.Item
                  key={item.id}
                  icon={{
                    source: getArticleThumbnail(item),
                    mask: Image.Mask.Circle,
                  }}
                  title={item.content.title}
                  actions={<Actions item={item} />}
                  accessories={[
                    {
                      text: item.content.article?.word_count
                        ? item.content.article?.word_count.toString() + " words"
                        : "",
                    },
                  ]}
                />
              ))
            : ""}
        </List>
      ) : (
        <TokenErrorHandle></TokenErrorHandle>
      )}
    </>
  );
}
