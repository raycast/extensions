import { Action, ActionPanel, Color, Detail, Grid, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { BRAND } from "./lib/data";
import {
  formatPublished,
  parsePosts,
  postToMarkdown,
  postsUrl,
  publicPostUrl,
  publicTagUrl,
  isTrustedImage,
  readImageSize,
} from "./lib/ghost";
import type { BlogPost } from "./lib/types";

const ALL_TAGS = "__all__";

export default function SearchBlog() {
  const [tag, setTag] = useState(ALL_TAGS);

  const { isLoading, data, error } = useFetch(postsUrl(), {
    parseResponse: async (response) => {
      if (!response.ok) {
        // Ghost reports auth and key problems as structured JSON.
        const detail = await response.json().catch(() => undefined);
        const message = (detail as { errors?: { message?: string }[] })?.errors?.[0]?.message;
        throw new Error(message ?? `${response.status} ${response.statusText}`);
      }
      return parsePosts(await response.json());
    },
    initialData: [] as BlogPost[],
    keepPreviousData: true,
  });

  const posts = data ?? [];
  const tags = useMemo(() => [...new Set(posts.flatMap((post) => post.tags.map((t) => t.name)))].sort(), [posts]);
  const visible = useMemo(
    () => (tag === ALL_TAGS ? posts : posts.filter((post) => post.tags.some((t) => t.name === tag))),
    [posts, tag],
  );

  return (
    // A grid rather than a list: `List.Item` icons are a fixed small size, so
    // feature images only read as thumbnails at grid scale.
    <Grid
      isLoading={isLoading}
      columns={3}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      searchBarPlaceholder="Search the CeyPay blog…"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by tag" storeValue onChange={setTag}>
          <Grid.Dropdown.Item title="All Tags" value={ALL_TAGS} />
          {tags.map((name) => (
            <Grid.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        icon={error ? Icon.Warning : Icon.Document}
        title={error ? "Could not load posts" : "No matching posts"}
        description={error ? error.message : "Try a different term, or widen the tag filter."}
      />
      <Grid.Section title="Posts" subtitle={`${visible.length}`}>
        {visible.map((post) => (
          <PostItem key={post.id} post={post} />
        ))}
      </Grid.Section>
    </Grid>
  );
}

function PostItem({ post }: { post: BlogPost }) {
  // Date and tags move into the subtitle: a grid cell has no accessory slot.
  const subtitle = [formatPublished(post.publishedAt), post.tags.map((tag) => tag.name).join(", ")]
    .filter(Boolean)
    .join(" · ");

  return (
    <Grid.Item
      // Posts with no feature image — or one from a host we do not trust, since
      // rendering it would fetch it — fall back to a brand-tinted glyph.
      content={
        isTrustedImage(post.featureImage)
          ? { value: { source: post.featureImage }, tooltip: post.excerpt }
          : { value: { source: Icon.Document, tintColor: BRAND }, tooltip: post.excerpt }
      }
      title={post.title}
      subtitle={subtitle}
      keywords={post.tags.map((tag) => tag.name.toLowerCase()).concat(post.slug.split("-"))}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Eye} title="Read in Raycast" target={<PostDetail post={post} />} />
          <Action.OpenInBrowser url={publicPostUrl(post.slug)} shortcut={{ modifiers: ["cmd"], key: "return" }} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={publicPostUrl(post.slug)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * Reads the feature image's real dimensions from its file header. Ghost does not
 * report them, and sizing an image without them makes Raycast crop it, so the
 * first couple of kilobytes are fetched to measure it.
 */
function useHeroSize(url: string | undefined) {
  // The URL comes from post metadata, so it is only fetched if it is one we trust.
  const probeable = isTrustedImage(url);

  const { data } = useFetch(probeable ? url : "", {
    execute: probeable,
    headers: { Range: "bytes=0-2047" },
    parseResponse: async (response) => {
      if (!response.ok) return undefined;
      return readImageSize(new Uint8Array(await response.arrayBuffer()));
    },
    keepPreviousData: true,
  });

  return data;
}

function PostDetail({ post }: { post: BlogPost }) {
  const heroSize = useHeroSize(post.featureImage);
  const markdown = useMemo(() => postToMarkdown(post, heroSize), [post, heroSize]);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={post.title}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={publicPostUrl(post.slug)} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={publicPostUrl(post.slug)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {post.tags[0]?.slug ? (
            <Action.OpenInBrowser
              icon={{ source: Icon.Tag, tintColor: Color.SecondaryText }}
              title={`Browse “${post.tags[0].name}” Posts`}
              url={publicTagUrl(post.tags[0].slug)}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
