import { Icon, Keyboard, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TinkererArticles } from "./api/articles";
import { TinkererCommunity } from "./api/community";
import { getApiClient } from "./api/preferences";
import { ClubArticle } from "./lib/article";
import { FeedPost, postTypeEmoji, relativeTime } from "./lib/feed";

function compact(value: string, length = 52): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function postTitle(post: FeedPost): string {
  if (post.type === "MEMBER_JOINED") return `${post.author.name} joined the club`;
  return compact(post.title ?? post.content ?? `Update from ${post.author.name}`);
}

function postSubtitle(post: FeedPost): string {
  return [
    post.author.name,
    relativeTime(post.publishedAt),
    post.commentCount ? `💬 ${post.commentCount}` : undefined,
    post.reactionCount ? `✨ ${post.reactionCount}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

function articleSubtitle(article: ClubArticle): string {
  return [
    article.author.name,
    relativeTime(article.publishedAt),
    article.readingTimeMinutes ? `⏱ ${article.readingTimeMinutes} min` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

function runCommand(name: string): void {
  void launchCommand({ name, type: LaunchType.UserInitiated });
}

export default function MenuBarCommand() {
  const client = useMemo(() => getApiClient(), []);
  const community = useMemo(() => new TinkererCommunity(client), [client]);
  const articlesApi = useMemo(() => new TinkererArticles(client), [client]);
  const [articles, setArticles] = useState<ClubArticle[]>([]);
  const [failure, setFailure] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const [posts, setPosts] = useState<FeedPost[]>([]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setFailure(undefined);
    const [feedResult, articleResult] = await Promise.allSettled([
      community.feed(8),
      articlesApi.list("published", ""),
    ]);

    if (feedResult.status === "fulfilled") setPosts(feedResult.value.posts);
    if (articleResult.status === "fulfilled") setArticles(articleResult.value);

    const failed: string[] = [];
    if (feedResult.status === "rejected") failed.push("feed");
    if (articleResult.status === "rejected") failed.push("articles");
    setFailure(failed.length ? `Could not refresh ${failed.join(" and ")}.` : undefined);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, [articlesApi, community]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updatedText = lastUpdated
    ? `Updated ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(lastUpdated)}`
    : "Not updated yet";

  return (
    <MenuBarExtra
      icon={failure && posts.length === 0 && articles.length === 0 ? Icon.Warning : "tinkerer-club-icon.png"}
      isLoading={isLoading}
      tooltip={`Tinkerer Club · ${failure ?? updatedText}`}
    >
      <MenuBarExtra.Section title="⚡ Latest feed">
        {posts.slice(0, 5).map((post, index) => (
          <MenuBarExtra.Item
            key={post.id}
            icon={post.author.avatarUrl ?? Icon.SpeechBubble}
            onAction={() => (post.url ? void open(post.url) : runCommand("browse-feed"))}
            subtitle={postSubtitle(post)}
            title={`${index + 1}. ${postTypeEmoji(post.type)} ${postTitle(post)}`}
          />
        ))}
        {!isLoading && posts.length === 0 ? (
          <MenuBarExtra.Item title="No feed items available" icon={Icon.Minus} />
        ) : null}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="📚 Latest articles">
        {articles.slice(0, 4).map((article, index) => (
          <MenuBarExtra.Item
            key={article.id}
            icon={article.coverUrl ?? Icon.Book}
            onAction={() => (article.url ? void open(article.url) : runCommand("browse-articles"))}
            subtitle={articleSubtitle(article)}
            title={`${index + 1}. ${compact(article.title)}`}
          />
        ))}
        {!isLoading && articles.length === 0 ? (
          <MenuBarExtra.Item title="No articles available" icon={Icon.Minus} />
        ) : null}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Tinkerer Club">
        <MenuBarExtra.Item title="Browse Feed" icon={Icon.SpeechBubble} onAction={() => runCommand("browse-feed")} />
        <MenuBarExtra.Item title="Browse Articles" icon={Icon.Book} onAction={() => runCommand("browse-articles")} />
        <MenuBarExtra.Item
          title="Quick Post"
          icon={Icon.Message}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => runCommand("quick-post")}
        />
        <MenuBarExtra.Item title="Browse Prompts" icon={Icon.Stars} onAction={() => runCommand("browse-prompts")} />
        <MenuBarExtra.Item
          title="Search Club"
          icon={Icon.MagnifyingGlass}
          onAction={() => runCommand("search-tinkerer")}
        />
        <MenuBarExtra.Item title="Open Tinkerer Club" icon={Icon.Globe} onAction={() => void open(client.baseUrl)} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        {failure ? <MenuBarExtra.Item title={failure} icon={Icon.Warning} /> : null}
        <MenuBarExtra.Item title={updatedText} icon={Icon.Clock} />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => void refresh()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
