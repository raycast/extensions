import { ActionPanel, Toast, showToast, Detail, List, Action, Icon } from "@raycast/api";
import { useRef, useState } from "react";
import fetch, { AbortError } from "node-fetch";

export default function Command() {
  const [results, setResults] = useState<RedditPost[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchRedditUrl, setSearchRedditUrl] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const doSearch = async (query: string) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setSearching(true);

    const params = new URLSearchParams();
    params.append("q", query);

    setSearchRedditUrl("https://www.reddit.com/search?" + params.toString());

    params.append("limit", "10");

    try {
      const response = await fetch("https://www.reddit.com/search.json?" + params.toString(), {
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
                selftext?: string;
                created_utc: number;
                thumbnail: string;
                subreddit: string;
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
            url: x.data.url,
            description: x.data.selftext,
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

  return (
    <List isLoading={searching} onSearchTextChange={doSearch} throttle searchBarPlaceholder="Search Reddit...">
      {results.map((x) => (
        <List.Item
          key={x.id}
          icon={x.thumbnail ? { source: x.thumbnail } : Icon.Text}
          title={x.title}
          accessoryTitle={`Posted ${x.created} r/${x.subreddit}`}
          actions={
            x.description ? (
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  target={
                    <Detail
                      navigationTitle={x.title}
                      markdown={x.description ? x.description : "No description"}
                      actions={
                        <ActionPanel>
                          <Action.OpenInBrowser url={x.url} />
                        </ActionPanel>
                      }
                    />
                  }
                />
                <Action.OpenInBrowser url={x.url} icon={Icon.Text} />
              </ActionPanel>
            ) : (
              <ActionPanel>
                <Action.OpenInBrowser url={x.url} icon={Icon.Text} />
              </ActionPanel>
            )
          }
        />
      ))}
      {results.length > 0 && (
        <List.Item
          key="searchOnReddit"
          icon={Icon.MagnifyingGlass}
          title="Show all results on Reddit..."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={searchRedditUrl} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

interface RedditPost {
  id: string;
  title: string;
  url: string;
  description: string;
  created: string;
  thumbnail: string;
  subreddit: string;
}
