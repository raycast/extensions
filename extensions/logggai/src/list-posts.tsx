import { List, ActionPanel, Action, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export default function Command() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { "Session Token": sessionToken } = getPreferenceValues();

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("https://logggai.run/api/posts", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const data = (await res.json()) as { posts?: Post[] };
        setPosts(data.posts || []);
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch posts" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchPosts();
  }, [sessionToken]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your devlogs...">
      {posts.map((post) => (
        <List.Item
          key={post.id}
          title={post.title}
          subtitle={new Date(post.createdAt).toLocaleString()}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://logggai.run/dashboard`} />
              <Action.CopyToClipboard content={post.content} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
