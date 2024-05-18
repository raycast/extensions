import { Action, ActionPanel, Detail, List } from "@raycast/api";
import React from "react";
import { useGetAllPostsOfaPublicationQuery, useGetPersonalFeedQuery } from "../generated/hooks_and_more";
import { apolloGqlClient } from "../grapqhqlClient";

type publication = {
  id: string;
  title?: string;
};

const FollowedAccountLists = () => {
  const {
    data: myFollowedAccounts,
    loading,
    fetchMore,
  } = useGetPersonalFeedQuery({
    client: apolloGqlClient,
    onCompleted(data) {
      console.log("feedData", data?.me);
    },
  });
  const myPersonalAccounts = myFollowedAccounts?.me?.follows?.nodes?.flatMap((a) => a?.publications?.edges);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search from User accounts you follow">
      {myPersonalAccounts?.map((a) => (
        <List.Item
          title={a?.node?.title}
          accessories={[
            {
              text: a?.node?.displayTitle,
              icon: a?.node?.favicon,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Open" target={<BlogsList id={a?.node?.id} />} />
              <Action.OpenInBrowser url={a?.node?.canonicalURL} />
            </ActionPanel>
          }
        />
      ))}
      {/* <List.Item
        title={"Search more"}
        actions={
          <ActionPanel>
            <Action title="Fetch more" onAction={() => fetchMore({})} />
          </ActionPanel>
        }
      /> */}
    </List>
  );
};

function BlogsList({ id }: publication) {
  const { data: publicationsBlogs, loading } = useGetAllPostsOfaPublicationQuery({
    client: apolloGqlClient,

    variables: {
      publicationId: id,
    },
    skip: !id,
    onCompleted(data) {
      console.log(data);
    },
    onError(error) {
      console.log(error);
    },
  });
  console.log(id);

  const blogs = publicationsBlogs?.publication?.posts?.edges;
  return (
    <List isLoading={loading} isShowingDetail={true}>
      {blogs?.map((b) => (
        <List.Item
          key={b?.node?.slug}
          title={{
            value: b?.node?.title,
            tooltip: b?.node?.subtitle,
          }}
          subtitle={b?.node?.subtitle}
          detail={
            <List.Item.Detail
              isLoading={loading}
              markdown={`### ${b?.node?.title}  ${b?.node?.brief} []`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link text={"Go to Blog"} title={b?.node?.slug} target={b?.node?.slug} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Tags">
                    {b?.node?.tags?.map((t) => <List.Item.Detail.Metadata.TagList.Item key={t?.name} text={t?.name} />)}
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={b?.node?.url} />
              <Action.CopyToClipboard content={b?.node?.url} title="Copy to Share" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
export default FollowedAccountLists;
