import { List, showToast, Toast, popToRoot, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { Actions } from "./Actions";
import { getQueue } from "./matterApi";

interface State {
  items?: any;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchQueue() {
      setLoading(true);
      try {
        const items: any = await getQueue();
        if (items.code == "token_not_valid") {
          showToast(Toast.Style.Failure, "Token not valid", "Please check your token in preferences");
          popToRoot();
          return;
        }
        setState({ items });
        setLoading(false);
      } catch (error) {
        setLoading(false);
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchQueue();
  }, []);

  function getArticleThumbnail(item: any) {
    if (item.content.photo_thumbnail_url) {
      return item.content.photo_thumbnail_url;
    } else if (item.content.publisher.domain_photo) {
      return item.content.publisher.domain_photo;
    } else {
      return "";
    }
  }

  return (
    <>
      <List isLoading={loading}>
        {state.items?.feed.map((item: any) => (
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
                text: item.content.article?.word_count ? item.content.article?.word_count.toString() + " words" : "",
              },
            ]}
          />
        ))}
      </List>
    </>
  );
}
