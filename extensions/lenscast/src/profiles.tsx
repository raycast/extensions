import { useState } from "react";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { PUBLICATIONS } from "./lib/fetchPublications";
import { Media, Post, ProfileData } from "./types";
import { useFetch } from "@raycast/utils";
import { PROFILE_SUGGESTIONS } from "./lib/fetchProfileSuggestions";

export default function Command() {
  return <Main />;
}

const API_URL = "https://api-v2.lens.dev/";
function Main() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: profileSuggestions, isLoading: profileSuggestionsLoading } = useFetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: PROFILE_SUGGESTIONS,
      variables: {
        query: searchTerm,
      },
    }),
    mapResult(result: { data: { searchProfiles: { items: ProfileData[] } } }) {
      return {
        data: result.data.searchProfiles.items,
      };
    },
    initialData: [],
    execute: !!searchTerm,
  });

  let title;
  if (!searchTerm) title = "Search for a Lens Profile";
  else if (profileSuggestions.length === 0) title = "No Profiles Found";
  else if (profileSuggestionsLoading) title = "Searching for Lens Profiles...";

  return (
    <List
      isLoading={profileSuggestionsLoading}
      searchText={searchTerm}
      throttle
      onSearchTextChange={(term) => setSearchTerm(term)}
    >
      <List.EmptyView icon={{ source: "list-icon.png" }} title={title} />
      {profileSuggestions.map((result: ProfileData) => {
        const avatar = normalizeUrl(result.metadata?.picture.raw?.uri || "");
        return (
          <List.Item
            key={result.profileId}
            title={result.handle.localName}
            icon={avatar ? { source: avatar, mask: Image.Mask.Circle, fallback: "👤" } : "👤"}
            actions={
              <ActionPanel>
                <Action.Push title="Show Profile" icon={Icon.Sidebar} target={<Profile {...result} />} />
                <Action.OpenInBrowser url={`https://hey.xyz/u/${result.handle.localName}`} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function Profile({ profileId, metadata, handle, stats }: ProfileData) {
  const bio = metadata?.bio;
  const picture = metadata?.picture;

  const { data: posts, isLoading } = useFetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: PUBLICATIONS,
      variables: {
        profileId,
      },
    }),
    mapResult(result: { data: { publications: { items: Post[] } } }) {
      return {
        data: result.data.publications.items,
      };
    },
    initialData: [],
    // execute: !!searchTerm
  });

  const avatar = normalizeUrl(picture?.raw?.uri);

  const getPostUrl = (post: Post) => {
    if (post.metadata.asset && "video" in post.metadata.asset) return `https://tape.xyz/watch/${post.id}`;
    return `https://hey.xyz/posts/${post.id}`;
  };

  const getPostMedia = (post: Post) => {
    if (!post.metadata.asset) return [];
    const media = [post.metadata.asset, ...post.metadata.attachments];
    return media;
  };

  const getPostArweaveLink = (link: string) => {
    if (link.includes("https://")) return link;
    return "https://arweave.net/" + link.replace("ar://", "");
  };

  return (
    <List isShowingDetail isLoading={isLoading} filtering={false} searchBarPlaceholder={handle.fullHandle}>
      <List.Section title="Profile">
        <List.Item
          icon={Icon.AtSymbol}
          title={handle.localName}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://hey.xyz/u/${handle.localName}`} />
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.CopyToClipboard title="Copy Profile ID" content={profileId} />
              <Action.CopyToClipboard title="Copy Lens Handle" content={handle.localName} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={avatar && `<img src="${avatar}" width="180" height="180" />`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={profileId} />
                  <List.Item.Detail.Metadata.Label title="Name" text={handle.localName} />
                  <List.Item.Detail.Metadata.Label title="Bio" text={bio || ""} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Stats" />
                  <List.Item.Detail.Metadata.Label title="Following" text={String(stats.totalFollowing)} />
                  <List.Item.Detail.Metadata.Label title="Followers" text={String(stats.totalFollowers)} />
                  <List.Item.Detail.Metadata.Label title="Posts" text={String(stats.totalPosts)} />
                  <List.Item.Detail.Metadata.Label title="Comments" text={String(stats.totalComments)} />
                  <List.Item.Detail.Metadata.Label title="Mirrors" text={String(stats.totalMirrors)} />
                  {/* <List.Item.Detail.Metadata.Label title="Collects" text={String(stats.totalCollects)} /> */}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>
      <List.Section title="Recent Posts">
        {posts.map((post: Post) => {
          const media = getPostMedia(post);
          const hasMedia = media.length;
          return (
            <List.Item
              key={post.id}
              title={post.metadata.content?.substring(0, 50) ?? ""}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={getPostUrl(post)} />
                  {post.metadata.rawURI && (
                    <Action.OpenInBrowser title="Arweave Metadata" url={getPostArweaveLink(post.metadata.rawURI)} />
                  )}
                  {/* eslint-disable-next-line @raycast/prefer-title-case */}
                  <Action.CopyToClipboard title="Copy Post ID" content={post.id} />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={`
${post.metadata.content ?? ""}

${
  hasMedia
    ? media
        .filter((media): media is { image: Media } => "image" in media)
        .map((media) => `<img src="${normalizeUrl(media.image.raw.uri)}" />`)
        .join("")
    : ""
}

---

Likes: ${post.stats.upvotes}

Comments: ${post.stats.comments}

Mirrors: ${post.stats.mirrors}

Collects: ${post.stats.bookmarks}

---

Posted on: ${new Date(post.createdAt).toDateString()}
                    `}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export const normalizeUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  const parsed = new URL(url);

  if (parsed.host === "ipfs.infura.io") parsed.host = "lens.infura-ipfs.io";
  if (parsed.protocol == "ipfs:") {
    return `https://gw.ipfs-lens.dev/ipfs/${parsed.hostname != "" ? parsed.hostname : parsed.pathname.slice(2)}`;
  }

  return parsed.toString();
};
