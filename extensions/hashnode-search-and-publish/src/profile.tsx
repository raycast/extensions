import { ActionPanel, Action, Detail } from "@raycast/api";
import { useGetProfileDataQuery } from "../generated/hooks_and_more";
import { apolloGqlClient } from "../grapqhqlClient";
import { useState } from "react";

export function getRandomColor(): string {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
export default function Command() {
  const [mkdown, setMKDown] = useState("");
  const { data: myProfileData, loading } = useGetProfileDataQuery({
    client: apolloGqlClient,
    onCompleted(data) {
      setMKDown(
        `# Hashnode Dashboard  

 >${data?.me?.bio?.text}
        
  ### Publications 
  ${data?.me?.publications?.edges?.map((p) => `- ` + p?.node?.url)}
        

### Drafts 

${data?.me?.publications?.edges?.map((p) => p?.node?.drafts?.edges?.map((d) => d?.node?.title ?? " "))}
        ` ?? "",
      );
    },
  });

  return (
    <>
      <Detail
        isLoading={loading}
        markdown={mkdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="" icon={"logo-standard.png"} />
            <Detail.Metadata.Label title="" text={myProfileData?.me?.username} />
            <Detail.Metadata.Label title={`Followers Count`} text={myProfileData?.me?.followersCount?.toString()} />

            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="My Blogs" />

            {myProfileData?.me?.posts?.nodes?.map((p) => (
              <Detail.Metadata.Link key={p?.id} title={p?.title} target={p?.url} text={p?.subtitle || p?.slug} />
            ))}

            {myProfileData?.me?.tagsFollowing?.map((t) => (
              <Detail.Metadata.TagList title="Tags Followed">
                <Detail.Metadata.TagList.Item
                  key={t?.id}
                  text={t?.info?.text}
                  icon={t?.logo}
                  color={getRandomColor()}
                />
              </Detail.Metadata.TagList>
            ))}
            <Detail.Metadata.Separator />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Dashboard"
              url={`https://www.hashnode.com/@${myProfileData?.me?.username}`}
            />
            <Action.CopyToClipboard
              content={`https://www.hashnode.com/@${myProfileData?.me?.username}`}
              title="Share"
            />
          </ActionPanel>
        }
      />
    </>
  );
}
