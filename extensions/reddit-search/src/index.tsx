import { Toast, showToast } from "@raycast/api";
import { useRef, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import RedditPost from "./RedditPost";
import RedditPostList from "./RedditPostList";

const redditUrl = "https://www.reddit.com/";
const searchUrl = "https://www.reddit.com/search";
const apiUrl = "https://www.reddit.com/search.json";

export default function Command() {
  const [results, setResults] = useState<RedditPost[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchRedditUrl, setSearchRedditUrl] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const doSearch = async (query: string) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setSearching(true);
    setResults([]);

    const params = new URLSearchParams();
    params.append("q", query);

    setSearchRedditUrl(searchUrl + "?" + params.toString());

    params.append("limit", "10");

    try {
      const response = await fetch(apiUrl + "?" + params.toString(), {
        method: "get",
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const json = (await response.json()) as {
        data: {
          children: [
            {
              data: {
                id: string;
                title: string;
                url: string;
                permalink: string;
                selftext?: string;
                created_utc: number;
                thumbnail: string;
                subreddit: string;
                url_overridden_by_dest?: string;
                is_video: boolean;
              };
            }
          ];
        };
      };

      const reddits = json.data.children.map(
        (x) =>
          ({
            id: x.data.id,
            title: x.data.title,
            url: redditUrl + x.data.permalink,
            description: x.data.selftext,
            imageUrl:
              x.data.is_video ||
              (x.data.url_overridden_by_dest &&
                !x.data.url_overridden_by_dest.endsWith(".jpg") &&
                !x.data.url_overridden_by_dest.endsWith(".gif") &&
                !x.data.url_overridden_by_dest.endsWith(".png"))
                ? ""
                : x.data.url_overridden_by_dest,
            created: new Date(x.data.created_utc * 1000).toLocaleString(),
            thumbnail: x.data.thumbnail,
            subreddit: x.data.subreddit,
          } as RedditPost)
      );

      setResults(reddits);
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong :(",
        message: String(error),
      });
    } finally {
      setSearching(false);
    }
  };

  return <RedditPostList posts={results} searching={searching} doSearch={doSearch} searchRedditUrl={searchRedditUrl} />;
}
