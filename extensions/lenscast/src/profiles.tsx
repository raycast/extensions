import { useState } from "react";
import { Action, ActionPanel, Image, List } from "@raycast/api";
import { PROFILE_QUERY } from "./lib/fetchProfile";
import { useQuery } from "@apollo/client";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "./lib/apollo";
import { PROFILE_SUGGESTIONS } from "./lib/fetchProfileSuggestions";
import { PUBLICATIONS } from "./lib/fetchPublications";

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

  return (
    <List
      isLoading={profileSuggestionsLoading}
      searchText={searchTerm}
      onSearchTextChange={(term) => setSearchTerm(term)}
    >
      {profileSuggestions?.search?.items.map((result: any) => {
        const avatar = normalizeUrl(result.picture?.original?.url);
        return (
          <List.Item
            key={result.profileId}
            title={result.handle}
            icon={avatar ? { source: avatar, mask: Image.Mask.Circle } : "👤"}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show profile"
                  target={
                    <ApolloProvider client={apolloClient}>
                      <Profile {...result} />
                    </ApolloProvider>
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

type ProfileData = {
  profileId: string;
  bio: string;
  name: string;
  handle: string;
  picture: {
    original: {
      url: string;
    };
  };
  stats: {
    totalFollowers: string;
    totalFollowing: string;
    totalPosts: string;
    totalComments: string;
    totalMirrors: string;
    totalPublications: string;
    totalCollects: string;
  };
};

function Profile({ profileId, bio, name, handle, picture, stats }: ProfileData) {
  const { data: publications, loading: publicationsLoading } = useQuery(PUBLICATIONS, {
    variables: { profileId },
  });

  const posts = publications?.publications.items || [];

  const avatar = normalizeUrl(picture?.original?.url);

  return (
    <List isShowingDetail enableFiltering={false} searchBarPlaceholder={handle}>
      <List.Section title="Profile">
        <List.Item
          title={handle}
          detail={
            <List.Item.Detail
              markdown={`<img src="${avatar}" width="180" height="180" />`}
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
          {posts.map((post: any) => {
            const hasMedia = post.metadata?.media?.length > 0;

            return (
              <List.Item
                key={post.id}
                title={post.metadata.content.substring(0, 50)}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open on Lenser" url={`https://lenster.xyz/posts/${post.id}`} />
                  </ActionPanel>
                }
                detail={
                  <List.Item.Detail
                    markdown={`
${post.metadata.content}

${
  hasMedia
    ? post.metadata.media
        .filter((media) => media.original.mimeType.includes("image"))
        .map((media: any) => `<img src="${normalizeUrl(media.original.url)}" />`)
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
