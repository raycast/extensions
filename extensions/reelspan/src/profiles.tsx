import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { LoadError } from "./components/load-error";
import { client } from "./lib/client";
import { DASHBOARD_URL, errorMessage, networkName, profiles } from "./lib/reelspan";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(() => profiles(client()), [], {
    failureToastOptions: { title: "Could not load profiles" },
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
      {error ? (
        <LoadError title="Could not load profiles" error={error} onRetry={revalidate} />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.Person}
            title="No profiles yet"
            description="Create a profile in the Reelspan dashboard and connect your social accounts."
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Dashboard" url={DASHBOARD_URL} />
              </ActionPanel>
            }
          />
          {(data ?? []).map((p) => (
            <List.Item
              key={p.username}
              icon={Icon.Person}
              title={p.name ?? p.username}
              subtitle={p.username}
              accessories={[
                { text: p.networks.length ? p.networks.map(networkName).join(", ") : "No accounts connected" },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Copy Connect Link" icon={Icon.Link} onAction={() => connectLink(p.username)} />
                  <Action.CopyToClipboard title="Copy Username" content={p.username} />
                  <Action.OpenInBrowser title="Open Dashboard" url={DASHBOARD_URL} />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
