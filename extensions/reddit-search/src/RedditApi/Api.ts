import fetch from "node-fetch";
import RedditResult from "./RedditResult";
import RedditResultItem from "./RedditResultItem";
import RedditResultSubreddit from "./RedditResultSubreddit";
import { createSearchUrl, joinWithBaseUrl } from "./UrlBuilder";

export const searchAll = async (
  subreddit: string,
  query: string,
  limit: number,
  sort: string,
  after: string,
  abort?: AbortController
) => {
  const response = await fetch(createSearchUrl(subreddit, true, query, "", limit, sort, after), {
    method: "get",
    signal: abort?.signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const json = (await response.json()) as {
    data: {
      children: [
        {
          kind: string;
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

  return {
    url: createSearchUrl(subreddit, false, query, "", 0, sort),
    items:
      json.data && json.data.children
        ? json.data.children.map(
            (x) =>
              ({
                id: x.data.id,
                title: x.data.title,
                url: joinWithBaseUrl(x.data.permalink),
                contentUrl: x.data.url.indexOf(x.data.permalink) > -1 ? "" : x.data.url,
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
                afterId: `${x.kind}_${x.data.id}`,
              } as RedditResultItem)
          )
        : [],
  } as RedditResult;
};

export const searchSubreddits = async (query: string, limit: number, after: string, abort?: AbortController) => {
  const response = await fetch(createSearchUrl("", true, query, "sr", limit, "", after), {
    method: "get",
    signal: abort?.signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const json = (await response.json()) as {
    data: {
      children: [
        {
          kind: string;
          data: {
            id: string;
            title: string;
            url: string;
            created_utc: number;
            display_name_prefixed: string;
          };
        }
      ];
    };
  };

  return {
    url: createSearchUrl("", false, query, "sr", 0),
    subreddits:
      json.data && json.data.children
        ? json.data.children.map(
            (x) =>
              ({
                id: x.data.id,
                title: x.data.title,
                url: joinWithBaseUrl(x.data.url),
                subreddit: x.data.url,
                created: new Date(x.data.created_utc * 1000).toLocaleString(),
                subredditName: x.data.display_name_prefixed.substring(2),
                afterId: `${x.kind}_${x.data.id}`,
              } as RedditResultSubreddit)
          )
        : [],
  } as RedditResult;
};
