import { ActionPanel, Action, List, Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { injectBookmarkScraperScript, type Tweet } from "./readthem";

function TweetDetailView({ tweet }: { tweet: Tweet }) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const markdown = `
# ${tweet.authorName} (@${tweet.handle})

${tweet.tweetText}

---
**Posted:** ${formatDate(tweet.time)}

**Engagement:**
- 💬 ${tweet.replies} Replies
- 🔄 ${tweet.retweets} Retweets
- ❤️ ${tweet.likes} Likes

[Open Tweet →](${tweet.link})
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={tweet.link} />
          <Action.CopyToClipboard
            content={tweet.link}
            title="Copy Tweet URL"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            content={tweet.tweetText}
            title="Copy Tweet Text"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [bookmarks, setBookmarks] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBookmarks() {
      try {
        const tweets = await injectBookmarkScraperScript();
        setBookmarks(tweets);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch bookmarks",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchBookmarks();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bookmarks...">
      {bookmarks.map((bookmark, index) => (
        <List.Item
          key={index}
          title={bookmark.authorName}
          subtitle={bookmark.tweetText}
          accessories={[
            { text: `@${bookmark.handle}` },
            { text: `❤️ ${bookmark.likes}` },
            { text: `🔄 ${bookmark.retweets}` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View Tweet Details" target={<TweetDetailView tweet={bookmark} />} />
              <Action.OpenInBrowser url={bookmark.link} />
              <Action.CopyToClipboard
                content={bookmark.link}
                title="Copy Tweet URL"
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                content={bookmark.tweetText}
                title="Copy Tweet Text"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
