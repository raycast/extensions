import { useState } from "react";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useQuery } from "@apollo/client";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "./lib/apollo";
import { PROFILE_SUGGESTIONS } from "./lib/fetchProfileSuggestions";
import { PUBLICATIONS } from "./lib/fetchPublications";
import { MediaSet, Post, ProfileData, PublicationMainFocus } from "./types";

export default function Command() {
  return (
    <ApolloProvider client={apolloClient}>
      <Main />
    </ApolloProvider>
  );
}

function Main() {
  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined);

  const { data: profileSuggestions, loading: profileSuggestionsLoading } = useQuery(PROFILE_SUGGESTIONS, {
    variables: { query: searchTerm },
  });

  let title;
  if (!searchTerm) title = "Search for a Lens Profile";
  if (profileSuggestions?.search.items.length === 0) title = "No Profiles Found";
  if (profileSuggestionsLoading) title = "Searching for Lens Profiles...";

  return (
    <List
      isLoading={profileSuggestionsLoading}
      searchText={searchTerm}
      onSearchTextChange={(term) => setSearchTerm(term)}
    >
      <List.EmptyView icon={{ source: "list-icon.png" }} title={title} />
      {profileSuggestions?.search?.items.map((result: ProfileData) => {
        const avatar = normalizeUrl(result.picture?.original?.url);
        return (
          <List.Item
            key={result.profileId}
            title={result.handle}
            icon={avatar ? { source: avatar, mask: Image.Mask.Circle, fallback: "👤" } : "👤"}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show profile"
                  icon={Icon.Sidebar}
                  target={
                    <ApolloProvider client={apolloClient}>
                      <Profile {...result} />
                    </ApolloProvider>
                  }
                />
                <Action.OpenInBrowser url={`https://lenster.xyz/u/${result.handle}`} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function Profile({ profileId, bio, name, handle, picture, stats }: ProfileData) {
  const { data: publications } = useQuery(PUBLICATIONS, { variables: { profileId } });

  const posts = publications?.publications.items || [];
  const avatar = normalizeUrl(picture?.original?.url);

  const getPostUrl = (post: Post) => {
    switch (post.metadata.mainContentFocus) {
      case PublicationMainFocus.Video:
        return `https://lenstube.xyz/watch/${post.id}`;
      default:
        return `https://lenster.xyz/posts/${post.id}`;
    }
  };

  return (
    <List isShowingDetail enableFiltering={false} searchBarPlaceholder={handle}>
      <List.Section title="Profile">
        <List.Item
          title={handle}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://lenster.xyz/u/${handle}`} />
              <Action.CopyToClipboard title="Copy Profile ID" content={profileId} />
              <Action.CopyToClipboard title="Copy Lens Handle" content={handle} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={avatar && `<img src="${avatar}" width="180" height="180" />`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={profileId} />
                  <List.Item.Detail.Metadata.Label title="Name" text={name} />
                  <List.Item.Detail.Metadata.Label title="Bio" text={bio} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Stats" />
                  <List.Item.Detail.Metadata.Label title="Following" text={String(stats.totalFollowing)} />
                  <List.Item.Detail.Metadata.Label title="Followers" text={String(stats.totalFollowers)} />
                  <List.Item.Detail.Metadata.Label title="Posts" text={String(stats.totalPosts)} />
                  <List.Item.Detail.Metadata.Label title="Comments" text={String(stats.totalComments)} />
                  <List.Item.Detail.Metadata.Label title="Mirrors" text={String(stats.totalMirrors)} />
                  <List.Item.Detail.Metadata.Label title="Collects" text={String(stats.totalCollects)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>
      {posts.length > 0 && (
        <List.Section title="Recent Posts">
          {posts.map((post: Post) => {
            const hasMedia = post.metadata?.media?.length > 0;
            return (
              <List.Item
                key={post.id}
                title={post.metadata.content?.substring(0, 50) ?? ""}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={getPostUrl(post)} />
                    <Action.OpenInBrowser title="Arweave Metadata" url={post.profile.metadata} />
                    <Action.CopyToClipboard title="Copy Post ID" content={post.id} />
                  </ActionPanel>
                }
                detail={
                  <List.Item.Detail
                    markdown={`
${post.metadata.content}

${
  hasMedia
    ? post.metadata.media
        .filter((media: MediaSet) => media.original.mimeType?.includes("image"))
        .map((media: MediaSet) => `<img src="${normalizeUrl(media.original.url)}" />`)
        .join("")
    : ""
}

---

Likes: ${post.stats.totalUpvotes}

Comments: ${post.stats.totalAmountOfComments}

Mirrors: ${post.stats.totalAmountOfMirrors}

Collects: ${post.stats.totalAmountOfCollects}

---

Posted on: ${String(new Date(post.createdAt).toDateString())}
                    `}
                  />
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

export const normalizeUrl = (url: string): string | undefined => {
  if (!url) return undefined;
  const parsed = new URL(url);

  if (parsed.host === "ipfs.infura.io") parsed.host = "lens.infura-ipfs.io";
  if (parsed.protocol == "ipfs:") {
    return `https://lens.infura-ipfs.io/ipfs/${parsed.hostname != "" ? parsed.hostname : parsed.pathname.slice(2)}`;
  }

  return parsed.toString();
};
