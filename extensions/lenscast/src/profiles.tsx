import { useState } from "react";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { PUBLICATIONS } from "./lib/fetchPublications";
import { MediaSet, Post, ProfileData, PublicationMainFocus } from "./types";
import { useFetch } from "@raycast/utils";

export default function Command() {
  return <Main />;
}

function Main() {
  const gql =
`
query SearchProfiles($request: ProfileSearchRequest!) {
  searchProfiles(request: $request) {
    items {
      profileId: id
      metadata {
        bio
        displayName
        picture {
          ... on ImageSet {
            raw {
              uri
            }
          }
        }
      }
      handle {
        fullHandle
        localName
      }
      stats {
        totalFollowers: followers
        totalFollowing: following
        totalPosts: posts
        totalComments: comments
        totalPublications: publications
        totalMirrors: mirrors
      }
    }
  }
}
`;

const [searchTerm, setSearchTerm] = useState("");
const { data: profileSuggestions, isLoading: profileSuggestionsLoading } = useFetch("https://api-v2.lens.dev/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: gql,
      variables: {
        request: {
          query: searchTerm
        }
      }
    }),
    mapResult(result: { data: { searchProfiles: { items: ProfileData[] } } }) {
      return {
        data: result.data.searchProfiles.items
      }
    },
    initialData: [],
    execute: !!searchTerm
  })

  let title;
  if (!searchTerm) title = "Search for a Lens Profile";
  if (profileSuggestions.length === 0) title = "No Profiles Found";
  if (profileSuggestionsLoading) title = "Searching for Lens Profiles...";

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
                <Action.Push
                  title="Show Profile"
                  icon={Icon.Sidebar}
                  target={
                    <Profile {...result} />
                  }
                />
                <Action.OpenInBrowser url={`https://lenster.xyz/u/${result.handle.localName}`} />
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

  const { data: posts, isLoading } = useFetch("https://api-v2.lens.dev/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: PUBLICATIONS,
      variables: {
        profileId
      }
    }),
    mapResult(result: { data: { publications: {items: Post[]} } } ) {
      return {
        data: result.data.publications.items
      }
    },
    initialData: [],
    // execute: !!searchTerm
  })

  const avatar = normalizeUrl(picture?.raw?.uri);

  const getPostUrl = (post: Post) => {
    switch (post.metadata.mainContentFocus) {
      case PublicationMainFocus.Video:
        return `https://lenstube.xyz/watch/${post.id}`;
      default:
        return `https://lenster.xyz/posts/${post.id}`;
    }
  };

  return (
    (<List isShowingDetail isLoading={isLoading} filtering={false} searchBarPlaceholder={handle.fullHandle}>
      <List.Section title="Profile">
        <List.Item
          title={handle.fullHandle}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://lenster.xyz/u/${handle.localName}`} />
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
                    {/* <Action.OpenInBrowser title="Arweave Metadata" url={post.profile.metadata} /> */}
                    {/* eslint-disable-next-line @raycast/prefer-title-case */}
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
    </List>)
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
