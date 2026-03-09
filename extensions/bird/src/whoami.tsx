import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { getBirdPath, isBirdInstalled } from "./hooks/useBirdCommand";
import { BirdNotInstalled } from "./components/BirdNotInstalled";

export default function WhoAmICommand() {
  const birdBin = getBirdPath();
  const installed = isBirdInstalled();
  const { isLoading, data, error } = useExec(birdBin, ["whoami", "--json"], { execute: installed });

  if (!installed) return <BirdNotInstalled />;

  let user: { id: string; username: string; name: string } | undefined;
  if (data) {
    try {
      user = JSON.parse(data);
    } catch {
      // ignore parse errors
    }
  }

  const markdown = error
    ? `## Error\n\n${error.message}`
    : user
      ? `# @${user.username}\n\n**Name:** ${user.name}\n\n**ID:** ${user.id}\n\n[Open Profile](https://x.com/${user.username})`
      : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        user ? (
          <ActionPanel>
            <Action.OpenInBrowser url={`https://x.com/${user.username}`} title="Open Profile" />
            <Action.CopyToClipboard title="Copy Username" content={`@${user.username}`} icon={Icon.Person} />
            <Action.CopyToClipboard title="Copy User Id" content={user.id} icon={Icon.Key} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
