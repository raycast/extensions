import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { client } from "./lib/client";
import { errorMessage, networkName, profiles } from "./lib/reelspan";

export default function Command() {
  const { data, isLoading } = usePromise(() => profiles(client()), [], {
    onError: (e) =>
      void showToast({ style: Toast.Style.Failure, title: "Could not load profiles", message: errorMessage(e) }),
  });

  async function connectLink(username: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating link…" });
    try {
      const r = await client().connect.link(username);
      await Clipboard.copy(r.access_url);
      toast.style = Toast.Style.Success;
      toast.title = "Connect link copied";
      toast.message = "Valid for 48 hours";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create a link";
      toast.message = errorMessage(e);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter profiles">
      {(data ?? []).map((p) => (
        <List.Item
          key={p.username}
          icon={Icon.Person}
          title={p.name ?? p.username}
          subtitle={p.username}
          accessories={[{ text: p.networks.length ? p.networks.map(networkName).join(", ") : "No accounts connected" }]}
          actions={
            <ActionPanel>
              <Action title="Copy Connect Link" icon={Icon.Link} onAction={() => connectLink(p.username)} />
              <Action.CopyToClipboard title="Copy Username" content={p.username} />
              <Action.OpenInBrowser title="Open Dashboard" url="https://app.reelspan.com/dashboard" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
