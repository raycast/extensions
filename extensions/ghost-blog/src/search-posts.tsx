import {
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  blogUrl: string;
  adminUrl?: string;
  contentApiKey: string;
}

interface Post {
  id: string;
  title: string;
  url: string;
  slug: string;
  published_at: string;
  feature_image?: string;
}

interface GhostApiResponse {
  posts: Post[];
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { blogUrl, adminUrl, contentApiKey } = preferences;

  // Construct API URL carefully to handle trailing slashes
  const cleanBlogUrl = blogUrl.replace(/\/+$/, "");
  const apiUrl = new URL("/ghost/api/content/posts/", cleanBlogUrl);
  apiUrl.searchParams.append("key", contentApiKey);
  apiUrl.searchParams.append("limit", "20");
  apiUrl.searchParams.append(
    "fields",
    "id,title,url,slug,published_at,feature_image",
  );
  apiUrl.searchParams.append("order", "published_at DESC");

  const { isLoading, data, error } = useFetch<GhostApiResponse>(
    apiUrl.toString(),
    {
      onError(error) {
        console.error("Ghost API Error:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch posts",
          message: error.message.includes("401")
            ? "Invalid API Key. Check your Content API Key in preferences."
            : "Could not connect to Ghost blog. Check your Blog URL.",
        });
      },
    },
  );

  const posts = data?.posts ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent posts...">
      {error ? (
        <List.EmptyView
          title="Failed to Load Posts"
          description="Check your Blog URL and API Key in extension preferences"
          icon={Icon.ExclamationMark}
        />
      ) : (
        posts.map((post) => {
          // Construct Editor URL
          const baseAdminUrl = (adminUrl || blogUrl).replace(/\/+$/, "");
          const editorUrl = `${baseAdminUrl}/ghost/#/editor/post/${post.id}`;

          // Format the published date
          const publishedDate = new Date(post.published_at).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            },
          );

          return (
            <List.Item
              key={post.id}
              title={post.title}
              subtitle={publishedDate}
              icon={
                post.feature_image
                  ? { source: post.feature_image }
                  : Icon.Document
              }
              accessories={[{ text: post.slug }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url={post.url}
                      icon={Icon.Globe}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={post.url}
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.OpenInBrowser
                      title="Open in Ghost Editor"
                      url={editorUrl}
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Editor URL"
                      content={editorUrl}
                      icon={Icon.Link}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
