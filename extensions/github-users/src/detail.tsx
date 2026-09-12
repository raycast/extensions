import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { octokit, onRequestError } from "./utils";

const getMarkdown = (avatarUrl: string, bio = "") => {
  return `
${bio}
    
![](${avatarUrl})
`;
};

export function UserDetail({ username, avatarUrl }: { username: string; avatarUrl: string }) {
  const { isLoading, data } = useCachedPromise(
    async (id: string) => {
      const response = await octokit.rest.users.getByUsername({
        username: id,
        mediaType: { format: "json" },
      });

      return response.data;
    },
    [username],
    {
      keepPreviousData: true,
      onError: onRequestError,
    }
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdown(avatarUrl, data?.bio || undefined)}
      navigationTitle={data?.name || username}
      actions={
        (data?.html_url || data?.blog || data?.twitter_username) && (
          <ActionPanel>
            {data?.html_url && <Action.OpenInBrowser title="Open in GitHub" url={data.html_url} />}
            {data?.blog && <Action.OpenInBrowser title="Open Website" url={data.blog} />}
            {data?.twitter_username && (
              <Action.OpenInBrowser title="Open Twitter" url={`https://twitter.com/${data.twitter_username}`} />
            )}
          </ActionPanel>
        )
      }
      metadata={
        <Detail.Metadata>
          {data?.html_url && <Detail.Metadata.Link title="GitHub" target={data.html_url} text={username} />}
          {data?.blog && <Detail.Metadata.Link title="Website" target={data.blog} text={data.blog} />}
          {data?.twitter_username && (
            <Detail.Metadata.Link
              title="Twitter"
              target={`https://twitter.com/${data.twitter_username}`}
              text={data.twitter_username}
            />
          )}
          {(data?.company || data?.location) && <Detail.Metadata.Separator />}
          {data?.company && <Detail.Metadata.Label title="Company" text={data.company} icon={Icon.Building} />}
          {data?.location && <Detail.Metadata.Label title="Location" text={data.location} icon={Icon.Pin} />}
          <Detail.Metadata.Separator />
          {data?.followers && (
            <Detail.Metadata.TagList title="Followers">
              <Detail.Metadata.TagList.Item text={data.followers.toString()} color={"#eed535"} />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}
