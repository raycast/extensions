import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { useArena } from "./hooks/useArena";
import { arenaOAuth } from "./api/oauth";

function MyProfileCommand() {
  const arena = useArena();
  const { data, isLoading } = usePromise(async () => {
    return arena.me();
  });

  const markdown = data
    ? [
        data.avatar ? `![Avatar](${data.avatar})` : "",
        "",
        `# ${data.full_name}`,
        `**@${data.slug}**`,
        "",
        "| | |",
        "|---|---|",
        `| **Channels** | ${data.channel_count} |`,
        `| **Followers** | ${data.follower_count} |`,
        `| **Following** | ${data.following_count} |`,
      ].join("\n")
    : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={isLoading ? "" : markdown}
      actions={
        data ? (
          <ActionPanel>
            <Action.OpenInBrowser url={`https://www.are.na/${data.slug}`} />
            <Action.CopyToClipboard title="Copy Profile URL" content={`https://www.are.na/${data.slug}`} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export default withAccessToken(arenaOAuth)(MyProfileCommand);
